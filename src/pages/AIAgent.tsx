import { Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIAgentAdmin } from "@/components/AIAgentAdmin";
import { AIAgentChat } from "@/components/AIAgentChat";
import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export default function AIAgent() {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useUserPermissions();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          Agente IA
        </h1>
        <p className="text-muted-foreground">
          {isAdmin 
            ? "Configure agentes de IA conectados ao n8n para automatizar conversas"
            : "Converse com agentes de IA inteligentes"
          }
        </p>
      </div>

      {isAdmin ? (
        // Admin View - Show both management and chat tabs
        <Tabs defaultValue="manage" className="space-y-6">
          <TabsList className="bg-muted/50">
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
      ) : (
        // User View - Show only chat
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
      )}
    </div>
  );
}
