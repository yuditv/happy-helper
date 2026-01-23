import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SubscriptionBannerProps {
  status: 'trial' | 'expiring' | 'expired';
  daysRemaining: number;
  onSubscribe: () => void;
}

export function SubscriptionBanner({ status, daysRemaining, onSubscribe }: SubscriptionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && status !== 'expired') return null;

  const config = {
    trial: {
      icon: Clock,
      title: 'Período de Teste',
      message: `Você tem ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'} restantes no seu trial gratuito.`,
      bgClass: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
      iconClass: 'text-blue-400',
      showDismiss: true,
    },
    expiring: {
      icon: AlertTriangle,
      title: 'Trial Expirando!',
      message: `Seu trial expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}. Assine agora para não perder acesso.`,
      bgClass: 'from-yellow-500/20 to-orange-500/10 border-yellow-500/30',
      iconClass: 'text-yellow-400',
      showDismiss: true,
    },
    expired: {
      icon: Zap,
      title: 'Assinatura Expirada',
      message: 'Seu período de teste expirou. Assine para desbloquear todas as funcionalidades.',
      bgClass: 'from-red-500/20 to-red-600/10 border-red-500/30',
      iconClass: 'text-red-400',
      showDismiss: false,
    },
  };

  const { icon: Icon, title, message, bgClass, iconClass, showDismiss } = config[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-lg border bg-gradient-to-r p-4',
        bgClass
      )}
    >
      {/* Efeito de brilho */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg bg-background/50', iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{title}</h4>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onSubscribe}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Zap className="h-4 w-4 mr-2" />
            Assinar Agora
          </Button>
          
          {showDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDismissed(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
