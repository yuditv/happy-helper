import { useState } from 'react';
import { ArrowLeft, DollarSign, MessageSquare, Bell, Palette, Shield, Save, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { usePlanSettings, PlanSetting } from '@/hooks/usePlanSettings';
import { MessageTemplatesTab } from '@/components/MessageTemplatesTab';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const { settings, isLoading, saveSettings } = usePlanSettings();
  const [editedSettings, setEditedSettings] = useState<PlanSetting[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Notification preferences (local state - could be persisted later)
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailReminders: true,
    reminderDays: [7, 3, 1],
    autoSendReminders: false,
  });

  // Theme preference
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'dark';
    }
    return 'dark';
  });

  const handlePlanSettingChange = (planKey: string, field: 'planName' | 'planPrice', value: string | number) => {
    const currentSettings = editedSettings.length > 0 ? editedSettings : settings;
    const updated = currentSettings.map(s => 
      s.planKey === planKey 
        ? { ...s, [field]: field === 'planPrice' ? Number(value) : value }
        : s
    );
    setEditedSettings(updated);
    setHasChanges(true);
  };

  const handleSavePlanSettings = async () => {
    if (editedSettings.length === 0) return;
    await saveSettings(editedSettings);
    setHasChanges(false);
    setEditedSettings([]);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', systemDark);
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
    
    toast.success(`Tema alterado para ${newTheme === 'light' ? 'Claro' : newTheme === 'dark' ? 'Escuro' : 'Sistema'}`);
  };

  const currentSettings = editedSettings.length > 0 ? editedSettings : settings;

  const planIcons: Record<string, string> = {
    monthly: '📅',
    quarterly: '📆',
    semiannual: '🗓️',
    annual: '🎯',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Personalize o sistema conforme suas necessidades</p>
          </div>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4">
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Planos</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Mensagens</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Aparência</span>
            </TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Configurações de Planos
                </CardTitle>
                <CardDescription>
                  Personalize os nomes e preços padrão dos planos oferecidos aos seus clientes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  {currentSettings.map((plan) => (
                    <Card key={plan.planKey} className="bg-muted/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <span>{planIcons[plan.planKey]}</span>
                          {plan.planKey === 'monthly' && 'Plano Mensal'}
                          {plan.planKey === 'quarterly' && 'Plano Trimestral'}
                          {plan.planKey === 'semiannual' && 'Plano Semestral'}
                          {plan.planKey === 'annual' && 'Plano Anual'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${plan.planKey}`}>Nome do Plano</Label>
                          <Input
                            id={`name-${plan.planKey}`}
                            value={plan.planName}
                            onChange={(e) => handlePlanSettingChange(plan.planKey, 'planName', e.target.value)}
                            placeholder="Nome do plano"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`price-${plan.planKey}`}>Preço Padrão (R$)</Label>
                          <Input
                            id={`price-${plan.planKey}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={plan.planPrice}
                            onChange={(e) => handlePlanSettingChange(plan.planKey, 'planPrice', e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {hasChanges && (
                  <div className="flex justify-end">
                    <Button onClick={handleSavePlanSettings} className="gap-2">
                      <Save className="h-4 w-4" />
                      Salvar Alterações
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <MessageTemplatesTab />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Preferências de Notificações
                </CardTitle>
                <CardDescription>
                  Configure como e quando deseja receber lembretes sobre vencimentos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembretes por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar emails automáticos para clientes com planos próximos do vencimento
                    </p>
                  </div>
                  <Switch
                    checked={notificationPrefs.emailReminders}
                    onCheckedChange={(checked) => 
                      setNotificationPrefs(prev => ({ ...prev, emailReminders: checked }))
                    }
                  />
                </div>

                <div className="space-y-3">
                  <Label>Dias antes do vencimento para enviar lembrete</Label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 3, 5, 7, 14, 30].map((day) => (
                      <Button
                        key={day}
                        variant={notificationPrefs.reminderDays.includes(day) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setNotificationPrefs(prev => ({
                            ...prev,
                            reminderDays: prev.reminderDays.includes(day)
                              ? prev.reminderDays.filter(d => d !== day)
                              : [...prev.reminderDays, day].sort((a, b) => b - a)
                          }));
                        }}
                      >
                        {day} {day === 1 ? 'dia' : 'dias'}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecionados: {notificationPrefs.reminderDays.length > 0 
                      ? notificationPrefs.reminderDays.join(', ') + ' dias antes'
                      : 'Nenhum'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Envio Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar lembretes automaticamente sem confirmação manual
                    </p>
                  </div>
                  <Switch
                    checked={notificationPrefs.autoSendReminders}
                    onCheckedChange={(checked) => 
                      setNotificationPrefs(prev => ({ ...prev, autoSendReminders: checked }))
                    }
                  />
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    💡 <strong>Dica:</strong> As notificações automáticas são processadas diariamente às 09:00. 
                    Você também pode enviar lembretes manualmente a qualquer momento.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Aparência
                </CardTitle>
                <CardDescription>
                  Personalize a aparência do sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Tema</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => handleThemeChange('light')}
                    >
                      <Sun className="h-6 w-6" />
                      <span>Claro</span>
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => handleThemeChange('dark')}
                    >
                      <Moon className="h-6 w-6" />
                      <span>Escuro</span>
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => handleThemeChange('system')}
                    >
                      <Monitor className="h-6 w-6" />
                      <span>Sistema</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Segurança e Privacidade
                </CardTitle>
                <CardDescription>
                  Informações sobre segurança da sua conta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400">Conta Protegida</p>
                    <p className="text-sm text-muted-foreground">
                      Seus dados estão seguros com criptografia de ponta a ponta.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Autenticação segura via email</p>
                  <p>• Dados armazenados com criptografia</p>
                  <p>• Políticas de segurança em nível de linha (RLS)</p>
                  <p>• Acesso restrito apenas aos seus dados</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
