import { useState, useMemo } from 'react';
import { Save, RotateCcw, MessageSquare, Mail, Info, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMessageTemplates, templateLabels, templateVariables, MessageTemplate } from '@/hooks/useMessageTemplates';

// Sample data for preview
const sampleData = {
  nome: 'João Silva',
  plano: 'Trimestral',
  dias: '5',
  data_vencimento: '15/01/2026',
  valor: 'R$ 54,99'
};

function replaceWithSampleData(content: string): string {
  return content
    .replace(/\{nome\}/g, sampleData.nome)
    .replace(/\{plano\}/g, sampleData.plano)
    .replace(/\{dias\}/g, sampleData.dias)
    .replace(/\{data_vencimento\}/g, sampleData.data_vencimento)
    .replace(/\{valor\}/g, sampleData.valor);
}

export function MessageTemplatesTab() {
  const { templates, isLoading, saveTemplate, resetTemplate } = useMessageTemplates();
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate({ ...template });
    setShowPreview(false);
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    setIsSaving(true);
    const success = await saveTemplate(editingTemplate);
    if (success) {
      setEditingTemplate(null);
      setShowPreview(false);
    }
    setIsSaving(false);
  };

  const handleReset = async (templateType: string) => {
    await resetTemplate(templateType);
    setEditingTemplate(null);
    setShowPreview(false);
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setShowPreview(false);
  };

  const insertVariable = (variable: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      content: editingTemplate.content + variable
    });
  };

  const previewContent = useMemo(() => {
    if (!editingTemplate) return '';
    return replaceWithSampleData(editingTemplate.content);
  }, [editingTemplate?.content]);

  const previewSubject = useMemo(() => {
    if (!editingTemplate?.subject) return '';
    return replaceWithSampleData(editingTemplate.subject);
  }, [editingTemplate?.subject]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const whatsappTemplates = templates.filter(t => t.templateType.startsWith('whatsapp'));
  const emailTemplates = templates.filter(t => t.templateType.startsWith('email'));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Variáveis Disponíveis
          </CardTitle>
          <CardDescription>
            Use estas variáveis nos seus templates. Elas serão substituídas automaticamente pelos dados do cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {templateVariables.map(v => (
              <TooltipProvider key={v.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => editingTemplate && insertVariable(v.key)}
                    >
                      {v.key}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{v.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Exemplo: {sampleData.nome} | {sampleData.plano} | {sampleData.dias} dias | {sampleData.data_vencimento} | {sampleData.valor}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-4">
          {whatsappTemplates.map(template => (
            <Card key={template.templateType}>
              <CardHeader>
                <CardTitle className="text-lg">{templateLabels[template.templateType]}</CardTitle>
                {template.id && (
                  <Badge variant="outline" className="w-fit">Personalizado</Badge>
                )}
              </CardHeader>
              <CardContent>
                {editingTemplate?.templateType === template.templateType ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Mensagem</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPreview(!showPreview)}
                          className="gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          {showPreview ? 'Ocultar Preview' : 'Ver Preview'}
                        </Button>
                      </div>
                      <Textarea
                        value={editingTemplate.content}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                        rows={6}
                        placeholder="Digite a mensagem..."
                      />
                    </div>
                    
                    {showPreview && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Preview com dados de exemplo:</Label>
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 whitespace-pre-wrap text-sm">
                          {previewContent}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button variant="outline" onClick={handleCancel}>
                        Cancelar
                      </Button>
                      {template.id && (
                        <Button variant="destructive" onClick={() => handleReset(template.templateType)}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restaurar Padrão
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm">
                      {template.content}
                    </div>
                    <Button variant="outline" onClick={() => handleEdit(template)}>
                      Editar Template
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          {emailTemplates.map(template => (
            <Card key={template.templateType}>
              <CardHeader>
                <CardTitle className="text-lg">{templateLabels[template.templateType]}</CardTitle>
                {template.id && (
                  <Badge variant="outline" className="w-fit">Personalizado</Badge>
                )}
              </CardHeader>
              <CardContent>
                {editingTemplate?.templateType === template.templateType ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Assunto do Email</Label>
                      <Input
                        value={editingTemplate.subject || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                        placeholder="Assunto do email..."
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Corpo do Email</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPreview(!showPreview)}
                          className="gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          {showPreview ? 'Ocultar Preview' : 'Ver Preview'}
                        </Button>
                      </div>
                      <Textarea
                        value={editingTemplate.content}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                        rows={8}
                        placeholder="Digite o conteúdo do email..."
                      />
                    </div>
                    
                    {showPreview && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Preview com dados de exemplo:</Label>
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-2">
                          {previewSubject && (
                            <div>
                              <span className="text-xs text-muted-foreground">Assunto:</span>
                              <p className="font-medium">{previewSubject}</p>
                            </div>
                          )}
                          <div className="whitespace-pre-wrap text-sm border-t border-blue-500/20 pt-2 mt-2">
                            {previewContent}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button variant="outline" onClick={handleCancel}>
                        Cancelar
                      </Button>
                      {template.id && (
                        <Button variant="destructive" onClick={() => handleReset(template.templateType)}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restaurar Padrão
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {template.subject && (
                      <div>
                        <Label className="text-muted-foreground">Assunto:</Label>
                        <p className="font-medium">{template.subject}</p>
                      </div>
                    )}
                    <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm">
                      {template.content}
                    </div>
                    <Button variant="outline" onClick={() => handleEdit(template)}>
                      Editar Template
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
