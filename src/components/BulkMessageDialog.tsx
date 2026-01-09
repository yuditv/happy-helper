import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { MessageCircle, Send, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface BulkMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  mode: 'whatsapp' | 'email';
  defaultMessage: string;
  onSend: (message: string) => Promise<void>;
  progress?: { current: number; total: number; success: number; failed: number };
  isSending?: boolean;
}

export function BulkMessageDialog({
  open,
  onOpenChange,
  selectedCount,
  mode,
  defaultMessage,
  onSend,
  progress,
  isSending = false,
}: BulkMessageDialogProps) {
  const [message, setMessage] = useState(defaultMessage);

  const handleSend = async () => {
    await onSend(message);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSending) {
      onOpenChange(newOpen);
      if (newOpen) {
        setMessage(defaultMessage);
      }
    }
  };

  const progressPercentage = progress ? (progress.current / progress.total) * 100 : 0;
  const isComplete = progress && progress.current === progress.total;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'whatsapp' ? (
              <MessageCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Send className="h-5 w-5 text-blue-500" />
            )}
            Enviar {mode === 'whatsapp' ? 'WhatsApp' : 'Email'} em Lote
          </DialogTitle>
          <DialogDescription>
            Personalize a mensagem para {selectedCount} cliente(s) selecionado(s).
            {mode === 'whatsapp' && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Use {'{nome}'}, {'{plano}'}, {'{dias}'} e {'{vencimento}'} como variáveis.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isSending && !isComplete && (
            <>
              <div className="space-y-2">
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Digite sua mensagem..."
                  className="resize-none"
                />
              </div>
            </>
          )}

          {(isSending || isComplete) && progress && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso do envio</span>
                  <span className="font-medium">{progress.current} / {progress.total}</span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
              </div>

              <div className="flex items-center justify-center gap-6 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-500 font-medium">{progress.success} enviado(s)</span>
                </div>
                {progress.failed > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive font-medium">{progress.failed} falhou(aram)</span>
                  </div>
                )}
              </div>

              {isComplete && (
                <div className="text-center pt-2">
                  <p className="text-sm text-muted-foreground">
                    Envio concluído!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {isComplete ? (
            <Button onClick={() => handleOpenChange(false)}>
              Fechar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !message.trim()}
                className={mode === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    {mode === 'whatsapp' ? <MessageCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    Enviar
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
