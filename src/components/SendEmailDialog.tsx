import { useState, useEffect } from 'react';
import { Client } from '@/types/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Mail, Send, Loader2, FileText, Eye, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { emailTemplates, EmailTemplate, replaceTemplateVariables, getTemplatesByCategory } from '@/lib/emailTemplates';

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function SendEmailDialog({ open, onOpenChange, client }: SendEmailDialogProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'preview'>('templates');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSubject('');
      setMessage('');
      setSelectedTemplate(null);
      setActiveTab('templates');
      setCategoryFilter('all');
    }
  }, [open]);

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    if (client && template.id !== 'custom') {
      setSubject(replaceTemplateVariables(template.subject, client));
      setMessage(replaceTemplateVariables(template.body, client));
    } else {
      setSubject(template.subject);
      setMessage(template.body);
    }
    setActiveTab('preview');
  };

  const handleSend = async () => {
    if (!client?.email) {
      toast.error('Cliente não possui email cadastrado');
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast.error('Preencha o assunto e a mensagem');
      return;
    }

    setIsSending(true);

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="margin: 20px 0; white-space: pre-wrap; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px;">Este email foi enviado automaticamente.</p>
        </div>
      `;

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: client.email,
          subject: subject,
          html: htmlContent,
        },
      });

      if (error) throw error;

      toast.success(`Email enviado para ${client.name}`);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Erro ao enviar email: ' + (error.message || 'Tente novamente'));
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onOpenChange(false);
    }
  };

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'welcome', label: 'Boas-vindas' },
    { id: 'renewal', label: 'Renovação' },
    { id: 'expiration', label: 'Vencimento' },
    { id: 'custom', label: 'Outros' },
  ];

  const filteredTemplates = getTemplatesByCategory(categoryFilter);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Enviar Email
          </DialogTitle>
        </DialogHeader>

        {client && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Client Info */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50 mb-4">
              <p className="text-sm font-medium">{client.name}</p>
              <p className="text-xs text-muted-foreground">{client.email || 'Sem email cadastrado'}</p>
            </div>

            {!client.email ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Este cliente não possui email cadastrado.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Edite o cliente para adicionar um email.
                </p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'templates' | 'preview')} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="templates" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2">
                    <Edit3 className="h-4 w-4" />
                    Editar & Enviar
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="flex-1 overflow-hidden flex flex-col mt-4">
                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {categories.map((cat) => (
                      <Badge
                        key={cat.id}
                        variant={categoryFilter === cat.id ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={() => setCategoryFilter(cat.id)}
                      >
                        {cat.label}
                      </Badge>
                    ))}
                  </div>

                  {/* Templates List */}
                  <ScrollArea className="flex-1">
                    <div className="grid gap-2 pr-4">
                      {filteredTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className={`w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50 hover:bg-primary/5 ${
                            selectedTemplate?.id === template.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border/50 bg-background'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-xl">{template.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{template.name}</p>
                              {template.subject && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {template.subject}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {categories.find(c => c.id === template.category)?.label}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="preview" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Assunto</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Digite o assunto do email"
                      disabled={isSending}
                    />
                  </div>

                  <div className="space-y-2 flex-1 flex flex-col">
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 min-h-[200px] resize-none"
                      disabled={isSending}
                    />
                  </div>

                  {/* Variables Help */}
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                    <p className="font-medium mb-1">Variáveis disponíveis:</p>
                    <p className="break-words">
                      {'{nome}'}, {'{email}'}, {'{plano}'}, {'{servico}'}, {'{valor}'}, {'{vencimento}'}, {'{usuario}'}, {'{senha}'}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Cancelar
          </Button>
          {client?.email && activeTab === 'preview' && (
            <Button onClick={handleSend} disabled={isSending || !subject.trim() || !message.trim()}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Email
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
