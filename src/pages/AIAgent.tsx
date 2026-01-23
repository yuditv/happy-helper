import { Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIAgentAdmin } from "@/components/AIAgentAdmin";
import { AIAgentChat } from "@/components/AIAgentChat";
import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { motion } from "framer-motion";

export default function AIAgent() {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useUserPermissions();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

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
  );
}
