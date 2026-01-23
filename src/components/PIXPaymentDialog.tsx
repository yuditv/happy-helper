import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Clock, 
  Copy, 
  QrCode, 
  RefreshCw,
  AlertCircle,
  CheckCircle2 
} from 'lucide-react';
import { SubscriptionPlan, SubscriptionPayment, formatCurrencyBRL } from '@/types/subscription';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PIXPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  payment: SubscriptionPayment | null;
  onRefreshStatus: () => void;
  onSimulatePayment?: () => void; // Para testes
}

export function PIXPaymentDialog({
  open,
  onOpenChange,
  plan,
  payment,
  onRefreshStatus,
  onSimulatePayment,
}: PIXPaymentDialogProps) {
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutos em segundos
  const [copied, setCopied] = useState(false);

  // Timer de expiração
  useEffect(() => {
    if (!open || payment?.status === 'paid') return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, payment?.status]);

  // Reset timer quando abre
  useEffect(() => {
    if (open && payment?.expires_at) {
      const expiresAt = new Date(payment.expires_at);
      const now = new Date();
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);
    }
  }, [open, payment?.expires_at]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyCode = () => {
    const pixCode = payment?.pix_code || 'PIX_CODE_PLACEHOLDER_' + payment?.id?.slice(0, 8);
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast({
      title: 'Código copiado!',
      description: 'Cole no seu app do banco para pagar.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!plan || !payment) return null;

  const isPaid = payment.status === 'paid';
  const isExpired = timeLeft === 0 || payment.status === 'expired';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {isPaid ? 'Pagamento Confirmado!' : 'Pagamento PIX'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isPaid 
              ? 'Sua assinatura foi ativada com sucesso.'
              : `Plano ${plan.name} - ${formatCurrencyBRL(plan.price)}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {isPaid ? (
            // Estado de sucesso
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <p className="text-center text-muted-foreground">
                Aproveite todos os recursos do sistema!
              </p>
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Continuar
              </Button>
            </motion.div>
          ) : isExpired ? (
            // Estado de expirado
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <p className="text-center text-muted-foreground">
                O código PIX expirou. Gere um novo código para continuar.
              </p>
              <Button 
                onClick={() => onOpenChange(false)} 
                className="w-full"
              >
                Tentar Novamente
              </Button>
            </div>
          ) : (
            // Estado de aguardando pagamento
            <>
              {/* Timer */}
              <div className="flex items-center justify-center gap-2">
                <Clock className={cn(
                  'h-5 w-5',
                  timeLeft < 300 ? 'text-red-400' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'font-mono text-lg',
                  timeLeft < 300 ? 'text-red-400' : 'text-muted-foreground'
                )}>
                  {formatTime(timeLeft)}
                </span>
                <Badge variant="outline" className="text-xs">
                  Expira
                </Badge>
              </div>

              {/* QR Code placeholder */}
              <div className="flex justify-center">
                <div className="w-48 h-48 bg-white rounded-xl p-4 flex items-center justify-center">
                  {payment.pix_qr_code ? (
                    <img 
                      src={payment.pix_qr_code} 
                      alt="QR Code PIX" 
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <QrCode className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Código copia e cola */}
              <div className="space-y-2">
                <p className="text-sm text-center text-muted-foreground">
                  Ou copie o código PIX:
                </p>
                <div className="relative">
                  <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all text-center">
                    {payment.pix_code || `PIX_${payment.id?.slice(0, 20)}...`}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCopyCode}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onRefreshStatus}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar Pagamento
                </Button>
                {onSimulatePayment && (
                  <Button
                    onClick={onSimulatePayment}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Simular Pago
                  </Button>
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                O pagamento é processado automaticamente. Aguarde a confirmação.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
