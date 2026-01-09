import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Send, Loader2, CheckCircle, XCircle, Clock, CalendarIcon, Repeat } from 'lucide-react';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

interface ScheduleOptions {
  scheduledAt: Date;
  recurrenceType: RecurrenceType;
  recurrenceEndDate?: Date;
}

interface BulkMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  mode: 'whatsapp' | 'email';
  defaultMessage: string;
  onSend: (message: string) => Promise<void>;
  onSchedule?: (message: string, options: ScheduleOptions) => Promise<void>;
  progress?: { current: number; total: number; success: number; failed: number };
  isSending?: boolean;
}

const recurrenceLabels: Record<RecurrenceType, string> = {
  none: 'Sem repetição',
  daily: 'Diariamente',
  weekly: 'Semanalmente',
  monthly: 'Mensalmente',
};

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
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>();

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage);
      setIsScheduleMode(false);
      setScheduledDate(undefined);
      setScheduledTime('09:00');
      setRecurrenceType('none');
      setRecurrenceEndDate(undefined);
    }
  }, [open, defaultMessage]);

  const handleSend = async () => {
    if (isScheduleMode && scheduledDate && onSchedule) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const scheduledAt = new Date(scheduledDate);
      scheduledAt.setHours(hours, minutes, 0, 0);
      await onSchedule(message, {
        scheduledAt,
        recurrenceType,
        recurrenceEndDate,
      });
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
  const isRecurrenceValid = recurrenceType === 'none' || recurrenceEndDate;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                  <div className="space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
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

                    {/* Recurrence options */}
                    <div className="space-y-3 pt-2 border-t border-dashed">
                      <div className="flex items-center gap-2">
                        <Repeat className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-xs font-medium">Repetição</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Frequência</Label>
                          <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(recurrenceLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {recurrenceType !== 'none' && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Até</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !recurrenceEndDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {recurrenceEndDate ? format(recurrenceEndDate, "dd/MM/yyyy") : "Selecione"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={recurrenceEndDate}
                                  onSelect={setRecurrenceEndDate}
                                  disabled={(date) => date < (scheduledDate || new Date())}
                                  initialFocus
                                  locale={ptBR}
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </div>
                      {recurrenceType !== 'none' && (
                        <p className="text-xs text-muted-foreground">
                          O envio será repetido {recurrenceLabels[recurrenceType].toLowerCase()} até a data final.
                        </p>
                      )}
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
                disabled={isSending || !message.trim() || !isScheduleValid || !isRecurrenceValid}
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
                        {recurrenceType !== 'none' ? 'Agendar recorrente' : 'Agendar'}
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
