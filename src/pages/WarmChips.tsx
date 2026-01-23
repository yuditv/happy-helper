import { WhatsAppWarming } from "@/components/WhatsAppWarming";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Lock, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { SubscriptionPlansDialog } from "@/components/SubscriptionPlansDialog";
import { useState } from "react";

export default function WarmChips() {
  const { isActive, isOnTrial, getRemainingDays } = useSubscription();
  const { isAdmin } = useUserPermissions();
  const [showPlans, setShowPlans] = useState(false);
  
  // Admins bypass subscription check
  const subscriptionExpired = !isActive() && !isAdmin;
  const trialActive = isOnTrial();
  const daysRemaining = getRemainingDays();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Premium Header */}
      <motion.div 
        className="flex items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="page-header-icon" style={{ 
          background: 'linear-gradient(135deg, hsl(25 95% 55%) 0%, hsl(15 90% 50%) 100%)',
          boxShadow: '0 8px 32px hsl(25 95% 55% / 0.35), 0 0 0 1px hsl(25 95% 55% / 0.2)'
        }}>
          <Flame className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gradient">Aquecer Chips</h1>
          <p className="text-muted-foreground">
            Simule conversas naturais entre instâncias para reduzir risco de banimento
          </p>
        </div>
      </motion.div>

      {/* Subscription Expired Banner */}
      {subscriptionExpired && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-destructive/50 bg-destructive/5 p-6 rounded-xl"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Assinatura Expirada</h3>
              <p className="text-muted-foreground">
                Renove sua assinatura para continuar usando o aquecimento de chips.
              </p>
            </div>
            <Button onClick={() => setShowPlans(true)} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Renovar Agora
            </Button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative"
      >
        {/* Overlay when expired */}
        {subscriptionExpired && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-xl flex items-center justify-center">
            <div className="text-center space-y-4">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-lg font-medium">Funcionalidade bloqueada</p>
              <Button onClick={() => setShowPlans(true)} variant="default">
                Renovar Assinatura
              </Button>
            </div>
          </div>
        )}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Sistema de Aquecimento</CardTitle>
            <CardDescription>
              Configure sessões de aquecimento para manter suas instâncias saudáveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WhatsAppWarming />
          </CardContent>
        </Card>
      </motion.div>

      <SubscriptionPlansDialog open={showPlans} onOpenChange={setShowPlans} />
    </div>
  );
}
