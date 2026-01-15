import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Users, Mail, Lock, Loader2, Phone, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Email inválido').max(255, 'Email muito longo');
const passwordSchema = z.string()
  .min(6, 'A senha deve ter pelo menos 6 caracteres')
  .max(128, 'A senha deve ter no máximo 128 caracteres');

// Security: Rate limiting for login attempts
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60000; // 1 minute in milliseconds

const getLoginAttempts = (): { count: number; lockedUntil: number } => {
  const stored = sessionStorage.getItem('login_attempts');
  if (!stored) return { count: 0, lockedUntil: 0 };
  try {
    return JSON.parse(stored);
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
};

const incrementLoginAttempts = () => {
  const attempts = getLoginAttempts();
  const newAttempts = {
    count: attempts.count + 1,
    lockedUntil: attempts.count + 1 >= MAX_LOGIN_ATTEMPTS 
      ? Date.now() + LOCKOUT_DURATION 
      : attempts.lockedUntil
  };
  sessionStorage.setItem('login_attempts', JSON.stringify(newAttempts));
  return newAttempts;
};

const resetLoginAttempts = () => {
  sessionStorage.removeItem('login_attempts');
};

const isAccountLocked = (): boolean => {
  const attempts = getLoginAttempts();
  if (attempts.lockedUntil > Date.now()) {
    return true;
  }
  if (attempts.lockedUntil > 0 && attempts.lockedUntil <= Date.now()) {
    resetLoginAttempts(); // Reset after lockout expires
  }
  return false;
};

const getRemainingLockoutTime = (): number => {
  const attempts = getLoginAttempts();
  return Math.max(0, Math.ceil((attempts.lockedUntil - Date.now()) / 1000));
};

const formatWhatsApp = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length === 0) return '';
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
};

const unformatWhatsApp = (value: string): string => {
  return value.replace(/\D/g, '');
};
const whatsappSchema = z.string().min(10, 'WhatsApp deve ter pelo menos 10 dígitos').regex(/^[0-9]+$/, 'WhatsApp deve conter apenas números');

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);


  const validateForm = (isSignUp = false) => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      return false;
    }
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast.error(passwordResult.error.errors[0].message);
      return false;
    }
    
    if (isSignUp) {
      if (password !== confirmPassword) {
        toast.error('As senhas não coincidem');
        return false;
      }
      const whatsappResult = whatsappSchema.safeParse(whatsapp);
      if (!whatsappResult.success) {
        toast.error(whatsappResult.error.errors[0].message);
        return false;
      }
    }
    
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Security: Check if account is locked due to too many attempts
    if (isAccountLocked()) {
      const remaining = getRemainingLockoutTime();
      toast.error(`Muitas tentativas de login. Aguarde ${remaining} segundos.`);
      return;
    }
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (error) {
        incrementLoginAttempts();
        const attempts = getLoginAttempts();
        
        if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
          toast.error('Conta bloqueada temporariamente. Aguarde 1 minuto.');
        } else if (error.message.includes('Invalid login credentials')) {
          toast.error(`Email ou senha incorretos. ${MAX_LOGIN_ATTEMPTS - attempts.count} tentativas restantes.`);
        } else {
          toast.error(error.message);
        }
      } else {
        resetLoginAttempts();
        toast.success('Login realizado com sucesso!');
        navigate('/');
      }
    } catch (err) {
      console.error('Auth error:', err);
      toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    setIsLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          whatsapp: whatsapp
        }
      }
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('Este email já está cadastrado. Faça login.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Conta criada com sucesso! Você já pode fazer login.');
      navigate('/');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast.error('Erro ao enviar email: ' + error.message);
    } else {
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setShowForgotPassword(false);
    }
    setIsLoading(false);
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
              <Mail className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
            <CardDescription>
              Digite seu email para receber um link de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Link de Recuperação
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowForgotPassword(false)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Users className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Gerenciador de Clientes</CardTitle>
          <CardDescription>
            Faça login ou crie sua conta para gerenciar seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm text-muted-foreground"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Esqueceu sua senha?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-whatsapp">WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-whatsapp"
                      type="tel"
                      placeholder="(91) 98091-0280"
                      value={formatWhatsApp(whatsapp)}
                      onChange={(e) => setWhatsapp(unformatWhatsApp(e.target.value))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
