import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Link, Globe, Smartphone, Palette, Cpu, Brain, Clock, MessageSquare, Settings2, Zap, Database } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const AI_MODELS = [
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Mais inteligente, ideal para raciocínio complexo' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Bom equilíbrio velocidade/qualidade (Recomendado)' },
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Mais rápido e econômico' },
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3.0 Flash (Preview)', description: 'Nova geração, rápido e capaz' },
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
    use_native_ai: true,
    system_prompt: '',
    ai_model: 'google/gemini-2.5-flash',
    // Message sending defaults
    response_delay_min: 2,
    response_delay_max: 5,
    max_lines_per_message: 0,
    split_mode: 'none',
    split_delay_min: 1,
    split_delay_max: 3,
    max_chars_per_message: 0,
    typing_simulation: true,
    // Memory defaults
    memory_enabled: true,
    memory_auto_extract: true,
    memory_sync_clients: true,
    memory_generate_summary: true,
    memory_max_items: 20,
  });

  useEffect(() => {
    if (editingAgent) {
      setFormData({
        name: editingAgent.name,
        description: editingAgent.description || '',
        webhook_url: editingAgent.webhook_url || '',
        icon: editingAgent.icon,
        color: editingAgent.color,
        is_active: editingAgent.is_active,
        is_whatsapp_enabled: editingAgent.is_whatsapp_enabled,
        is_chat_enabled: editingAgent.is_chat_enabled,
        use_native_ai: editingAgent.use_native_ai ?? true,
        system_prompt: editingAgent.system_prompt || '',
        ai_model: editingAgent.ai_model || 'google/gemini-2.5-flash',
        // Message sending config
        response_delay_min: editingAgent.response_delay_min ?? 2,
        response_delay_max: editingAgent.response_delay_max ?? 5,
        max_lines_per_message: editingAgent.max_lines_per_message ?? 0,
        split_mode: editingAgent.split_mode ?? 'none',
        split_delay_min: editingAgent.split_delay_min ?? 1,
        split_delay_max: editingAgent.split_delay_max ?? 3,
        max_chars_per_message: editingAgent.max_chars_per_message ?? 0,
        typing_simulation: editingAgent.typing_simulation ?? true,
        // Memory config
        memory_enabled: editingAgent.memory_enabled ?? true,
        memory_auto_extract: editingAgent.memory_auto_extract ?? true,
        memory_sync_clients: editingAgent.memory_sync_clients ?? true,
        memory_generate_summary: editingAgent.memory_generate_summary ?? true,
        memory_max_items: editingAgent.memory_max_items ?? 20,
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
        use_native_ai: true,
        system_prompt: '',
        ai_model: 'google/gemini-2.5-flash',
        response_delay_min: 2,
        response_delay_max: 5,
        max_lines_per_message: 0,
        split_mode: 'none',
        split_delay_min: 1,
        split_delay_max: 3,
        max_chars_per_message: 0,
        typing_simulation: true,
        // Memory defaults
        memory_enabled: true,
        memory_auto_extract: true,
        memory_sync_clients: true,
        memory_generate_summary: true,
        memory_max_items: 20,
      });
    }
  }, [editingAgent, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields based on type
    if (!formData.use_native_ai && !formData.webhook_url) {
      return; // Webhook URL is required for non-native agents
    }
    
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

  const SPLIT_MODES = [
    { value: 'none', label: 'Nenhum', description: 'Envia tudo em uma mensagem' },
    { value: 'paragraph', label: 'Parágrafos', description: 'Divide em quebras duplas de linha' },
    { value: 'lines', label: 'Linhas', description: 'Divide em cada quebra de linha' },
    { value: 'sentences', label: 'Frases', description: 'Divide em pontos finais (. ! ?)' },
    { value: 'chars', label: 'Caracteres', description: 'Divide por limite de caracteres' },
  ];

  const PRESETS = [
    { name: 'Instantâneo', delay: [0, 1], split: 'none', description: 'Resposta imediata' },
    { name: 'Natural', delay: [2, 5], split: 'paragraph', description: 'Parece humano' },
    { name: 'Cauteloso', delay: [5, 10], split: 'sentences', description: 'Mais natural ainda' },
    { name: 'Anti-Spam', delay: [10, 20], split: 'lines', description: 'Evita detecção' },
  ];

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setFormData({
      ...formData,
      response_delay_min: preset.delay[0],
      response_delay_max: preset.delay[1],
      split_mode: preset.split as any,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/50">
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
            {formData.use_native_ai 
              ? 'Configure um agente com IA nativa (Gemini)'
              : 'Configure um agente conectado ao seu workflow externo'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="relative z-10">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="sending" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Envio
              </TabsTrigger>
              <TabsTrigger value="memory" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Memória
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-5">
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
                  className="bg-background/50 border-border/50 focus:border-primary min-h-[60px]"
                />
              </motion.div>

              {/* Native AI Toggle */}
              <motion.div 
                custom={2}
                variants={formItemVariants}
                initial="hidden"
                animate="visible"
                className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">IA Nativa (Gemini)</p>
                      <p className="text-xs text-muted-foreground">
                        Usa Gemini diretamente, sem precisar de webhook externo
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.use_native_ai}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, use_native_ai: checked })
                    }
                  />
                </div>
              </motion.div>

              {/* Native AI Settings */}
              {formData.use_native_ai && (
                <>
                  {/* Model Selection */}
                  <motion.div 
                    custom={3}
                    variants={formItemVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                  >
                    <Label className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                      Modelo da IA
                    </Label>
                    <Select
                      value={formData.ai_model || 'google/gemini-2.5-flash'}
                      onValueChange={(value) => setFormData({ ...formData, ai_model: value })}
                    >
                      <SelectTrigger className="bg-background/50 border-border/50">
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{model.label}</span>
                              <span className="text-xs text-muted-foreground">{model.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>

                  {/* System Prompt */}
                  <motion.div 
                    custom={4}
                    variants={formItemVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                  >
                    <Label htmlFor="system_prompt" className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-muted-foreground" />
                      Prompt do Sistema
                    </Label>
                    <Textarea
                      id="system_prompt"
                      placeholder="Você é um assistente de vendas especializado em..."
                      value={formData.system_prompt}
                      onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                      className="bg-background/50 border-border/50 focus:border-primary min-h-[120px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Defina a personalidade, conhecimentos e comportamento do agente
                    </p>
                  </motion.div>
                </>
              )}

              {/* Webhook URL - Only for non-native */}
              {!formData.use_native_ai && (
                <motion.div 
                  custom={3}
                  variants={formItemVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2"
                >
                  <Label htmlFor="webhook_url" className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-muted-foreground" />
                    Webhook URL *
                  </Label>
                  <Input
                    id="webhook_url"
                    type="url"
                    placeholder="https://seu-n8n.com/webhook/..."
                    value={formData.webhook_url}
                    onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                    required={!formData.use_native_ai}
                    className="bg-background/50 border-border/50 focus:border-primary font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cole a URL do webhook do seu workflow (n8n, Make, etc.)
                  </p>
                </motion.div>
              )}

              {/* Color Picker */}
              <motion.div 
                custom={5}
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
                custom={6}
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
                    <Smartphone className="h-4 w-4 text-green-500" />
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
            </TabsContent>

            {/* Sending Configuration Tab */}
            <TabsContent value="sending" className="space-y-5">
              {/* Presets */}
              <motion.div 
                custom={0}
                variants={formItemVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  Presets Rápidos
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="p-2 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors text-center"
                    >
                      <p className="text-xs font-medium">{preset.name}</p>
                      <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Response Delay */}
              <motion.div 
                custom={1}
                variants={formItemVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30"
              >
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Delay de Resposta (segundos)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tempo de espera antes de enviar a primeira mensagem
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Mínimo</Label>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={formData.response_delay_min}
                      onChange={(e) => setFormData({ ...formData, response_delay_min: parseInt(e.target.value) || 0 })}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Máximo</Label>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={formData.response_delay_max}
                      onChange={(e) => setFormData({ ...formData, response_delay_max: parseInt(e.target.value) || 0 })}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Split Mode */}
              <motion.div 
                custom={2}
                variants={formItemVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30"
              >
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Modo de Divisão de Mensagens
                </Label>
                <Select
                  value={formData.split_mode || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, split_mode: value as any })}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Selecione o modo" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPLIT_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{mode.label}</span>
                          <span className="text-xs text-muted-foreground">{mode.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Split Delay - Only show if split mode is not none */}
                {formData.split_mode !== 'none' && (
                  <div className="pt-3 space-y-2">
                    <Label className="text-xs text-muted-foreground">Delay entre mensagens divididas (segundos)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Mínimo</Label>
                        <Input
                          type="number"
                          min={0}
                          max={30}
                          value={formData.split_delay_min}
                          onChange={(e) => setFormData({ ...formData, split_delay_min: parseInt(e.target.value) || 0 })}
                          className="bg-background/50 border-border/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Máximo</Label>
                        <Input
                          type="number"
                          min={0}
                          max={30}
                          value={formData.split_delay_max}
                          onChange={(e) => setFormData({ ...formData, split_delay_max: parseInt(e.target.value) || 0 })}
                          className="bg-background/50 border-border/50"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Limits */}
              <motion.div 
                custom={3}
                variants={formItemVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30"
              >
                <Label className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  Limites de Mensagem
                </Label>
                <p className="text-xs text-muted-foreground">
                  Use 0 para sem limite
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Máx. Linhas</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.max_lines_per_message}
                      onChange={(e) => setFormData({ ...formData, max_lines_per_message: parseInt(e.target.value) || 0 })}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Máx. Caracteres</Label>
                    <Input
                      type="number"
                      min={0}
                      max={4096}
                      value={formData.max_chars_per_message}
                      onChange={(e) => setFormData({ ...formData, max_chars_per_message: parseInt(e.target.value) || 0 })}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Typing Simulation */}
              <motion.div 
                custom={4}
                variants={formItemVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Simular "digitando..."</p>
                    <p className="text-xs text-muted-foreground">
                      Mostra indicador de digitação antes de enviar
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.typing_simulation}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, typing_simulation: checked })
                  }
                />
              </motion.div>
            </TabsContent>

            {/* Memory Configuration Tab */}
            <TabsContent value="memory" className="space-y-5">
              {/* Memory Enable */}
              <motion.div 
                custom={0}
                variants={formItemVariants}
                initial="hidden"
                animate="visible"
                className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Memória de Clientes</p>
                      <p className="text-xs text-muted-foreground">
                        Salva e lembra informações importantes dos clientes
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.memory_enabled}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, memory_enabled: checked })
                    }
                  />
                </div>
              </motion.div>

              {formData.memory_enabled && (
                <>
                  {/* Auto Extract */}
                  <motion.div 
                    custom={1}
                    variants={formItemVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <Brain className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Extração Automática</p>
                        <p className="text-xs text-muted-foreground">
                          Extrai nome, aparelho, plano e outras informações automaticamente
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.memory_auto_extract}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, memory_auto_extract: checked })
                      }
                    />
                  </motion.div>

                  {/* Sync with Clients */}
                  <motion.div 
                    custom={2}
                    variants={formItemVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Sincronizar com Clientes</p>
                        <p className="text-xs text-muted-foreground">
                          Usa dados de clientes cadastrados para enriquecer o contexto
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.memory_sync_clients}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, memory_sync_clients: checked })
                      }
                    />
                  </motion.div>

                  {/* Max Items */}
                  <motion.div 
                    custom={3}
                    variants={formItemVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2 p-4 rounded-lg bg-muted/20 border border-border/30"
                  >
                    <Label className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                      Limite de Memórias por Cliente
                    </Label>
                    <Input
                      type="number"
                      min={5}
                      max={100}
                      value={formData.memory_max_items}
                      onChange={(e) => setFormData({ ...formData, memory_max_items: parseInt(e.target.value) || 20 })}
                      className="bg-background/50 border-border/50 w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantidade máxima de informações customizadas salvas por cliente
                    </p>
                  </motion.div>
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <motion.div 
            custom={7}
            variants={formItemVariants}
            initial="hidden"
            animate="visible"
            className="flex justify-end gap-3 pt-6"
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
