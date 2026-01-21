import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Plus, Settings, Trash2, Power, PowerOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  description: string;
  prompt: string;
  active: boolean;
  createdAt: Date;
}

export function WhatsAppAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    prompt: ""
  });

  const handleCreateAgent = () => {
    if (!newAgent.name.trim()) {
      toast.error("Nome do agente é obrigatório");
      return;
    }

    const agent: Agent = {
      id: crypto.randomUUID(),
      name: newAgent.name,
      description: newAgent.description,
      prompt: newAgent.prompt,
      active: false,
      createdAt: new Date()
    };

    setAgents([...agents, agent]);
    setNewAgent({ name: "", description: "", prompt: "" });
    setIsCreateDialogOpen(false);
    toast.success("Agente criado com sucesso!");
  };

  const toggleAgent = (id: string) => {
    setAgents(agents.map(agent => 
      agent.id === id ? { ...agent, active: !agent.active } : agent
    ));
    const agent = agents.find(a => a.id === id);
    toast.success(agent?.active ? "Agente desativado" : "Agente ativado");
  };

  const deleteAgent = (id: string) => {
    setAgents(agents.filter(agent => agent.id !== id));
    toast.success("Agente removido");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Agentes de IA</h2>
          <p className="text-muted-foreground">
            Configure e gerencie seus agentes de IA para automação de conversas
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Novo Agente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Agente de IA</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Agente</Label>
                <Input
                  id="name"
                  placeholder="Ex: Atendente Virtual"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  placeholder="Breve descrição do agente"
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt do Sistema</Label>
                <Textarea
                  id="prompt"
                  placeholder="Instruções de comportamento do agente..."
                  className="min-h-[150px]"
                  value={newAgent.prompt}
                  onChange={(e) => setNewAgent({ ...newAgent, prompt: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAgent}>
                Criar Agente
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Agents List */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Seus Agentes de IA
          </CardTitle>
          <CardDescription>
            Gerencie os agentes configurados para responder automaticamente às mensagens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum agente configurado
              </h3>
              <p className="text-muted-foreground mb-6">
                Crie seu primeiro agente de IA para começar a automatizar suas conversas
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeiro Agente
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <Card key={agent.id} className="bg-background/50 border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${agent.active ? 'bg-green-500/20' : 'bg-muted'}`}>
                          <Bot className={`h-4 w-4 ${agent.active ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {agent.active ? 'Ativo' : 'Inativo'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={agent.active}
                        onCheckedChange={() => toggleAgent(agent.id)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {agent.description || "Sem descrição"}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1">
                        <Settings className="h-3 w-3" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteAgent(agent.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
