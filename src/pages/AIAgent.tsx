import { useState } from "react";
import { Bot, Lock, AlertTriangle, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AIAgentAdmin } from "@/components/AIAgentAdmin";
import { AIAgentChat } from "@/components/AIAgentChat";
import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionPlansDialog } from "@/components/SubscriptionPlansDialog";
import { motion } from "framer-motion";

export default function AIAgent() {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useUserPermissions();
  const { isActive, isOnTrial, getRemainingDays } = useSubscription();
  const [showPlans, setShowPlans] = useState(false);
  
  const subscriptionExpired = !isActive();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Subscription Expired Banner */}
      {subscriptionExpired && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Assinatura Expirada</p>
              <p className="text-sm text-muted-foreground">
                Renove sua assinatura para acessar os Agentes de IA
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowPlans(true)}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Zap className="h-4 w-4 mr-2" />
            Renovar Agora
          </Button>
        </motion.div>
      )}

      {/* Premium Header */}
      <motion.div 
        className="flex items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="page-header-icon" style={{
          background: 'linear-gradient(135deg, hsl(260 85% 60%) 0%, hsl(280 80% 55%) 100%)',
          boxShadow: '0 8px 32px hsl(260 85% 60% / 0.35), 0 0 0 1px hsl(260 85% 60% / 0.2)'
        }}>
          <Bot className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gradient">Agente IA</h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Configure agentes de IA conectados ao n8n para automatizar conversas"
              : "Converse com agentes de IA inteligentes"
            }
          </p>
        </div>
      </motion.div>

      {/* Main Content with Overlay */}
      <div className="relative">
        {/* Subscription Expired Overlay */}
        {subscriptionExpired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl"
          >
            <div className="text-center p-8 max-w-md">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Lock className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">
                Agente IA Bloqueado
              </h3>
              <p className="text-muted-foreground mb-6">
                Sua assinatura expirou. Renove para continuar utilizando os agentes de IA.
              </p>
              <Button 
                size="lg"
                onClick={() => setShowPlans(true)}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <Zap className="h-5 w-5 mr-2" />
                Ver Planos de Assinatura
              </Button>
            </div>
          </motion.div>
        )}

        {isAdmin ? (
          // Admin View - Show both management and chat tabs
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Tabs defaultValue="manage" className="space-y-6">
              <TabsList>
                <TabsTrigger value="manage" className="gap-2">
                  <Bot className="h-4 w-4" />
                  Gerenciar Agentes
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-2">
                  <Bot className="h-4 w-4" />
                  Testar Chat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manage">
                <AIAgentAdmin />
              </TabsContent>

              <TabsContent value="chat">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Testar Agente</CardTitle>
                    <CardDescription>
                      Teste a conversa com seus agentes configurados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AIAgentChat />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          // User View - Show only chat
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Assistentes Virtuais</CardTitle>
                <CardDescription>
                  Converse com nossos agentes de IA para obter ajuda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIAgentChat />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Subscription Plans Dialog */}
      <SubscriptionPlansDialog open={showPlans} onOpenChange={setShowPlans} />
    </div>
  );
}
