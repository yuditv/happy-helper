import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Link, Globe, Smartphone, Palette } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAIAgents, type AIAgent, type CreateAgentInput } from "@/hooks/useAIAgents";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAgent?: AIAgent | null;
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export function CreateAgentDialog({ open, onOpenChange, editingAgent }: CreateAgentDialogProps) {
  const { createAgent, updateAgent } = useAIAgents();
  const isEditing = !!editingAgent;

  const [formData, setFormData] = useState<CreateAgentInput>({
    name: '',
    description: '',
    webhook_url: '',
    icon: 'bot',
    color: COLORS[0],
    is_active: true,
    is_whatsapp_enabled: true,
    is_chat_enabled: true,
  });

  useEffect(() => {
    if (editingAgent) {
      setFormData({
        name: editingAgent.name,
        description: editingAgent.description || '',
        webhook_url: editingAgent.webhook_url,
        icon: editingAgent.icon,
        color: editingAgent.color,
        is_active: editingAgent.is_active,
        is_whatsapp_enabled: editingAgent.is_whatsapp_enabled,
        is_chat_enabled: editingAgent.is_chat_enabled,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        webhook_url: '',
        icon: 'bot',
        color: COLORS[0],
        is_active: true,
        is_whatsapp_enabled: true,
        is_chat_enabled: true,
      });
    }
  }, [editingAgent, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && editingAgent) {
      await updateAgent.mutateAsync({ id: editingAgent.id, ...formData });
    } else {
      await createAgent.mutateAsync(formData);
    }
    
    onOpenChange(false);
  };

  const formItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3 }
    })
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border/50">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-3xl rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/10 blur-3xl rounded-full" />
        </div>

        <DialogHeader className="relative z-10">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${formData.color}20` }}
            >
              <Bot className="h-5 w-5" style={{ color: formData.color }} />
            </div>
            {isEditing ? 'Editar Agente' : 'Criar Novo Agente'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Atualize as configurações do agente de IA'
              : 'Configure um agente conectado ao seu workflow do n8n'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* Name */}
          <motion.div 
            custom={0}
            variants={formItemVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            <Label htmlFor="name" className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              Nome do Agente *
            </Label>
            <Input
              id="name"
              placeholder="Ex: Assistente de Vendas"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="bg-background/50 border-border/50 focus:border-primary"
            />
          </motion.div>

          {/* Description */}
          <motion.div 
            custom={1}
            variants={formItemVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o que este agente faz..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-background/50 border-border/50 focus:border-primary min-h-[80px]"
            />
          </motion.div>

          {/* Webhook URL */}
          <motion.div 
            custom={2}
            variants={formItemVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            <Label htmlFor="webhook_url" className="flex items-center gap-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              Webhook URL do n8n *
            </Label>
            <Input
              id="webhook_url"
              type="url"
              placeholder="https://seu-n8n.com/webhook/..."
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              required
              className="bg-background/50 border-border/50 focus:border-primary font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Cole a URL do webhook do seu workflow no n8n
            </p>
          </motion.div>

          {/* Color Picker */}
          <motion.div 
            custom={3}
            variants={formItemVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              Cor do Agente
            </Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                    formData.color === color 
                      ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' 
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </motion.div>

          {/* Toggles */}
          <motion.div 
            custom={4}
            variants={formItemVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 pt-2"
          >
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Chat Web</p>
                  <p className="text-xs text-muted-foreground">
                    Usuários podem conversar via interface
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.is_chat_enabled}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_chat_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    Responder mensagens no WhatsApp
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.is_whatsapp_enabled}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_whatsapp_enabled: checked })
                }
              />
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div 
            custom={5}
            variants={formItemVariants}
            initial="hidden"
            animate="visible"
            className="flex justify-end gap-3 pt-4"
          >
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={createAgent.isPending || updateAgent.isPending}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {(createAgent.isPending || updateAgent.isPending) ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : (
                isEditing ? 'Salvar Alterações' : 'Criar Agente'
              )}
            </Button>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
