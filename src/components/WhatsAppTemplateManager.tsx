import { useState } from 'react';
import { useWhatsAppTemplates, WhatsAppTemplate } from '@/hooks/useWhatsAppTemplates';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  FileText, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  Copy,
  Check,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  onSelectTemplate: (content: string) => void;
}

const messageVariables = [
  { key: '{nome}', description: 'Nome do cliente' },
  { key: '{plano}', description: 'Plano atual' },
  { key: '{vencimento}', description: 'Data de vencimento' },
  { key: '{dias}', description: 'Dias até vencimento' },
];

type CopyType = 'copy' | 'anuncio' | 'lembrete' | 'promocao';
type ToneType = 'casual' | 'formal' | 'persuasivo' | 'urgente';

export function WhatsAppTemplateManager({ onSelectTemplate }: Props) {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useWhatsAppTemplates();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Generation states
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiType, setAiType] = useState<CopyType>('copy');
  const [aiTone, setAiTone] = useState<ToneType>('persuasivo');
  const [includeVariables, setIncludeVariables] = useState(true);

  const openNewDialog = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateContent('');
    setShowAiPanel(false);
    setAiPrompt('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.subject || '');
    setTemplateContent(template.content);
    setShowAiPanel(false);
    setAiPrompt('');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!templateName.trim() || !templateContent.trim()) return;
    
    setIsSaving(true);
    let success = false;
    
    if (editingTemplate) {
      success = await updateTemplate(editingTemplate.id, templateName, templateContent);
    } else {
      success = await createTemplate(templateName, templateContent);
    }
    
    if (success) {
      setIsDialogOpen(false);
      setTemplateName('');
      setTemplateContent('');
      setEditingTemplate(null);
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTemplate(deleteId);
    setDeleteId(null);
  };

  const handleCopy = (template: WhatsAppTemplate) => {
    onSelectTemplate(template.content);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Digite uma descrição do que deseja gerar');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-copy', {
        body: {
          prompt: aiPrompt,
          type: aiType,
          tone: aiTone,
          includeVariables
        }
      });

      if (error) {
        console.error('Error generating copy:', error);
        toast.error('Erro ao gerar mensagem. Tente novamente.');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.content) {
        setTemplateContent(data.content);
        toast.success('Mensagem gerada com sucesso!');
        setShowAiPanel(false);
      }
    } catch (error) {
      console.error('Error calling generate-copy:', error);
      toast.error('Erro ao conectar com o serviço de IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Templates de WhatsApp
            </CardTitle>
            <CardDescription>
              Salve mensagens frequentes para reutilizar
            </CardDescription>
          </div>
          <Button onClick={openNewDialog} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum template salvo</p>
            <p className="text-sm">Crie templates para agilizar seus disparos</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{template.subject || 'Sem nome'}</h4>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(template.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopy(template)}
                      >
                        {copiedId === template.id ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(template)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.content}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? 'Modifique o template salvo' 
                : 'Crie um template para reutilizar em seus disparos'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Template</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Lembrete de vencimento"
              />
            </div>

            {/* AI Generation Panel */}
            <Collapsible open={showAiPanel} onOpenChange={setShowAiPanel}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full gap-2 justify-between"
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Gerar com IA
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAiPanel ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="space-y-2">
                    <Label className="text-sm">Descreva o que você quer criar</Label>
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ex: Anúncio de promoção de internet fibra 300MB por R$99,90 com instalação grátis"
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <Select value={aiType} onValueChange={(v) => setAiType(v as CopyType)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="copy">Copy Geral</SelectItem>
                          <SelectItem value="anuncio">Anúncio</SelectItem>
                          <SelectItem value="lembrete">Lembrete</SelectItem>
                          <SelectItem value="promocao">Promoção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tom</Label>
                      <Select value={aiTone} onValueChange={(v) => setAiTone(v as ToneType)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                          <SelectItem value="persuasivo">Persuasivo</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="includeVariables"
                      checked={includeVariables}
                      onCheckedChange={(checked) => setIncludeVariables(checked === true)}
                    />
                    <Label htmlFor="includeVariables" className="text-sm cursor-pointer">
                      Incluir variáveis ({'{nome}'}, {'{plano}'}, etc.)
                    </Label>
                  </div>
                  
                  <Button 
                    onClick={handleGenerateWithAI}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="w-full gap-2"
                    type="button"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Gerar Mensagem
                      </>
                    )}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Digite a mensagem..."
                className="min-h-[150px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Variáveis disponíveis:</Label>
              <div className="flex flex-wrap gap-2">
                {messageVariables.map((v) => (
                  <Badge
                    key={v.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                    onClick={() => setTemplateContent(prev => prev + v.key)}
                  >
                    {v.key}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!templateName.trim() || !templateContent.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
