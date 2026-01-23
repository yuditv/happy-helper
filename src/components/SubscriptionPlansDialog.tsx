import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Sparkles, Zap } from 'lucide-react';
import { SubscriptionPlan, formatCurrencyBRL } from '@/types/subscription';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { PIXPaymentDialog } from '@/components/PIXPaymentDialog';

interface SubscriptionPlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const planIcons: Record<string, typeof Crown> = {
  'Mensal': Zap,
  'Trimestral': Sparkles,
  'Semestral': Crown,
  'Anual': Crown,
};

const planColors: Record<string, string> = {
  'Mensal': 'from-blue-500 to-blue-600',
  'Trimestral': 'from-purple-500 to-purple-600',
  'Semestral': 'from-amber-500 to-orange-500',
  'Anual': 'from-emerald-500 to-emerald-600',
};

export function SubscriptionPlansDialog({
  open,
  onOpenChange,
}: SubscriptionPlansDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlanData, setSelectedPlanData] = useState<SubscriptionPlan | null>(null);
  const { plans, isLoading } = useSubscription();

  const handleSelect = () => {
    if (selectedPlan) {
      const plan = plans.find(p => p.id === selectedPlan);
      if (plan) {
        setSelectedPlanData(plan);
        setShowPayment(true);
        onOpenChange(false);
      }
    }
  };

  const getMonthlyPrice = (plan: SubscriptionPlan) => {
    return plan.price / plan.duration_months;
  };

  const getSavings = (plan: SubscriptionPlan) => {
    const baseMonthly = plans.find(p => p.duration_months === 1)?.price || 39.90;
    const fullPrice = baseMonthly * plan.duration_months;
    return fullPrice - plan.price;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Escolha seu Plano
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Desbloqueie todas as funcionalidades e potencialize seu negócio
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-6">
            <AnimatePresence>
              {plans.map((plan, index) => {
                const Icon = planIcons[plan.name] || Zap;
                const colorClass = planColors[plan.name] || 'from-primary to-primary/80';
                const isPopular = plan.name === 'Semestral';
                const savings = getSavings(plan);
                const isSelected = selectedPlan === plan.id;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={cn(
                      'relative cursor-pointer rounded-xl border-2 p-5 transition-all duration-300',
                      'hover:scale-105 hover:shadow-lg',
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                        : 'border-border/50 bg-card/50 hover:border-primary/50',
                      isPopular && 'ring-2 ring-amber-500/50'
                    )}
                  >
                    {/* Badge Popular */}
                    {isPopular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Mais Popular
                      </Badge>
                    )}

                    {/* Ícone do plano */}
                    <div className={cn(
                      'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4',
                      colorClass
                    )}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    {/* Nome do plano */}
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {plan.name}
                    </h3>

                    {/* Desconto */}
                    {plan.discount_percentage > 0 && (
                      <Badge variant="secondary" className="mb-3 bg-green-500/20 text-green-400 border-green-500/30">
                        {plan.discount_percentage}% de desconto
                      </Badge>
                    )}

                    {/* Preço */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">
                          {formatCurrencyBRL(plan.price)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrencyBRL(getMonthlyPrice(plan))}/mês
                      </p>
                    </div>

                    {/* Economia */}
                    {savings > 0 && (
                      <p className="text-sm text-green-400 mb-4">
                        Economia de {formatCurrencyBRL(savings)}
                      </p>
                    )}

                    {/* Features */}
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-green-400" />
                        Acesso completo
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-green-400" />
                        Suporte prioritário
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-green-400" />
                        Atualizações gratuitas
                      </li>
                    </ul>

                    {/* Indicador de seleção */}
                    {isSelected && (
                      <motion.div
                        layoutId="selected-indicator"
                        className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none"
                        initial={false}
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Botão de confirmação */}
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              disabled={!selectedPlan || isLoading}
              onClick={handleSelect}
              className="min-w-[200px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {isLoading ? (
                'Carregando...'
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Continuar com Pagamento
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedPlanData && (
        <PIXPaymentDialog
          open={showPayment}
          onOpenChange={setShowPayment}
          plan={selectedPlanData}
        />
      )}
    </>
  );
}
