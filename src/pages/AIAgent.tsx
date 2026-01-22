import { WhatsAppAgents } from "@/components/WhatsAppAgents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";

export default function AIAgent() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          Agente IA
        </h1>
        <p className="text-muted-foreground">
          Configure agentes inteligentes para responder automaticamente no WhatsApp
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Seus Agentes de IA</CardTitle>
          <CardDescription>
            Crie e gerencie agentes para automatizar suas conversas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsAppAgents />
        </CardContent>
      </Card>
    </div>
  );
}
