import { useState } from 'react';
import { Client } from '@/types/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Mail, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function SendEmailDialog({ open, onOpenChange, client }: SendEmailDialogProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Olá <strong>${client.name}</strong>,</p>
          <div style="margin: 20px 0; white-space: pre-wrap;">${message}</div>
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
      setSubject('');
      setMessage('');
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
      setSubject('');
      setMessage('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Enviar Email
          </DialogTitle>
        </DialogHeader>

        {client && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-sm font-medium">{client.name}</p>
              <p className="text-xs text-muted-foreground">{client.email || 'Sem email cadastrado'}</p>
            </div>

            {!client.email ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  Este cliente não possui email cadastrado.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Edite o cliente para adicionar um email.
                </p>
              </div>
            ) : (
              <>
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

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="min-h-[150px] resize-none"
                    disabled={isSending}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Cancelar
          </Button>
          {client?.email && (
            <Button onClick={handleSend} disabled={isSending}>
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
