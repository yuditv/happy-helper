import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Send, Loader2, CheckCircle, XCircle, Clock, CalendarIcon } from 'lucide-react';

interface BulkMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  mode: 'whatsapp' | 'email';
  defaultMessage: string;
  onSend: (message: string) => Promise<void>;
  onSchedule?: (message: string, scheduledAt: Date) => Promise<void>;
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
  onSchedule,
  progress,
  isSending = false,
}: BulkMessageDialogProps) {
  const [message, setMessage] = useState(defaultMessage);
  const [isScheduleMode, setIsScheduleMode] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('09:00');

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage);
      setIsScheduleMode(false);
      setScheduledDate(undefined);
      setScheduledTime('09:00');
    }
  }, [open, defaultMessage]);

  const handleSend = async () => {
    if (isScheduleMode && scheduledDate && onSchedule) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const scheduledAt = new Date(scheduledDate);
      scheduledAt.setHours(hours, minutes, 0, 0);
      await onSchedule(message, scheduledAt);
    } else {
      await onSend(message);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSending) {
      onOpenChange(newOpen);
    }
  };

  const progressPercentage = progress ? (progress.current / progress.total) * 100 : 0;
  const isComplete = progress && progress.current === progress.total;

  const isScheduleValid = !isScheduleMode || (scheduledDate && scheduledTime);

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
            {isScheduleMode ? 'Agendar' : 'Enviar'} {mode === 'whatsapp' ? 'WhatsApp' : 'Email'} em Lote
          </DialogTitle>
          <DialogDescription>
            {isScheduleMode 
              ? `Agende o envio para ${selectedCount} cliente(s) selecionado(s).`
              : `Personalize a mensagem para ${selectedCount} cliente(s) selecionado(s).`
            }
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
                  rows={5}
                  placeholder="Digite sua mensagem..."
                  className="resize-none"
                />
              </div>

              {/* Schedule toggle and inputs */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isScheduleMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsScheduleMode(!isScheduleMode)}
                    className="gap-1.5"
                  >
                    <Clock className="h-4 w-4" />
                    {isScheduleMode ? 'Agendado' : 'Agendar envio'}
                  </Button>
                </div>

                {isScheduleMode && (
                  <div className="grid grid-cols-2 gap-3 animate-fade-in">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !scheduledDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "dd/MM/yyyy") : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            locale={ptBR}
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Horário</Label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {(isSending || isComplete) && progress && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isScheduleMode ? 'Agendando...' : 'Progresso do envio'}
                  </span>
                  <span className="font-medium">{progress.current} / {progress.total}</span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
              </div>

              <div className="flex items-center justify-center gap-6 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-500 font-medium">
                    {progress.success} {isScheduleMode ? 'agendado(s)' : 'enviado(s)'}
                  </span>
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
                    {isScheduleMode ? 'Agendamento concluído!' : 'Envio concluído!'}
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
                disabled={isSending || !message.trim() || !isScheduleValid}
                className={mode === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isScheduleMode ? 'Agendando...' : 'Enviando...'}
                  </>
                ) : (
                  <>
                    {isScheduleMode ? (
                      <>
                        <Clock className="h-4 w-4" />
                        Agendar
                      </>
                    ) : (
                      <>
                        {mode === 'whatsapp' ? <MessageCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        Enviar
                      </>
                    )}
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
