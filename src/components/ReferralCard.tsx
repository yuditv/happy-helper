import { useState } from 'react';
import { useReferral } from '@/hooks/useReferral';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Gift, 
  Copy, 
  Check, 
  Users, 
  DollarSign, 
  Share2, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Ticket
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/types/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ReferralCard() {
  const { 
    referralCode, 
    referrals, 
    pendingDiscount, 
    totalReferrals,
    completedReferrals,
    isLoading,
    applyReferralCode 
  } = useReferral();
  
  const [copied, setCopied] = useState(false);
  const [showApplyCode, setShowApplyCode] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleCopyCode = async () => {
    if (!referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar código');
    }
  };

  const handleShare = async () => {
    if (!referralCode) return;
    
    const shareText = `Use meu código de indicação ${referralCode} e ganhe desconto na sua assinatura!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Código de Indicação',
          text: shareText,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success('Link de indicação copiado!');
    }
  };

  const handleApplyCode = async () => {
    if (!inputCode.trim()) {
      toast.error('Digite um código de indicação');
      return;
    }

    setIsApplying(true);
    const result = await applyReferralCode(inputCode.trim());
    setIsApplying(false);

    if (result.success) {
      toast.success(result.message);
      setInputCode('');
      setShowApplyCode(false);
    } else {
      toast.error(result.message);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-border/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/30 overflow-hidden">
      {/* Decorative gradient line */}
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-plan-semiannual" />
      
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Gift className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-gradient">Sistema de Indicação</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-primary mb-1">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-gradient">{totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Indicações</p>
          </div>
          
          <div className="stat-card p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-plan-semiannual mb-1">
              <Check className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-plan-semiannual">{completedReferrals}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </div>
          
          <div className="stat-card p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-plan-annual mb-1">
              <DollarSign className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-plan-annual">{formatCurrency(pendingDiscount)}</p>
            <p className="text-xs text-muted-foreground">Desconto</p>
          </div>
        </div>

        {/* Referral Code Section */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Seu código de indicação:</p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={referralCode || ''}
                readOnly
                className="text-center text-lg font-mono font-bold tracking-widest bg-muted/30 border-primary/30 pr-10"
              />
              <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-pulse" />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyCode}
              className="border-primary/30 hover:border-primary hover:bg-primary/10"
            >
              {copied ? <Check className="h-4 w-4 text-plan-semiannual" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="border-accent/30 hover:border-accent hover:bg-accent/10"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Ticket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Como funciona?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Compartilhe seu código com amigos. Quando eles se cadastrarem usando seu código, 
                você ganha <span className="text-primary font-semibold">R$ 10,00 de desconto</span> na próxima mensalidade!
              </p>
            </div>
          </div>
        </div>

        {/* Apply Code Section */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowApplyCode(!showApplyCode)}
            className="w-full justify-between text-muted-foreground hover:text-foreground"
          >
            <span>Usar código de indicação</span>
            {showApplyCode ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {showApplyCode && (
            <div className="flex gap-2 animate-fade-in">
              <Input
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Digite o código"
                className="font-mono tracking-wider"
                maxLength={8}
              />
              <Button 
                onClick={handleApplyCode} 
                disabled={isApplying}
                className="btn-futuristic"
              >
                {isApplying ? 'Aplicando...' : 'Aplicar'}
              </Button>
            </div>
          )}
        </div>

        {/* Referral History */}
        {referrals.length > 0 && (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full justify-between text-muted-foreground hover:text-foreground"
            >
              <span>Histórico de indicações ({referrals.length})</span>
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showHistory && (
              <div className="space-y-2 animate-fade-in">
                {referrals.map((referral) => (
                  <div 
                    key={referral.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Indicação #{referral.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(referral.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={referral.status === 'completed' ? 'default' : 'secondary'}
                        className={referral.status === 'completed' ? 'bg-plan-semiannual/20 text-plan-semiannual border-plan-semiannual/30' : ''}
                      >
                        {referral.status === 'completed' ? 'Concluída' : 'Pendente'}
                      </Badge>
                      <p className="text-xs text-plan-annual mt-1">
                        +{formatCurrency(Number(referral.discount_amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}