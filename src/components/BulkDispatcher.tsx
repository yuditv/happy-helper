import { useState, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { usePlanSettings } from '@/hooks/usePlanSettings';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getDaysUntilExpiration } from '@/types/client';
import { openWhatsApp } from '@/lib/whatsapp';
import {
  Zap,
  Send,
  MessageCircle,
  Mail,
  Users,
  Calendar as CalendarIcon,
  Clock,
  Filter,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

type MessageMode = 'whatsapp' | 'email';
type SendMode = 'immediate' | 'scheduled';
type ClientFilter = 'all' | 'expiring7' | 'expiring3' | 'expiring1' | 'expired';

const filterLabels: Record<ClientFilter, string> = {
  all: 'Todos os clientes',
  expiring7: 'Vencendo em 7 dias',
  expiring3: 'Vencendo em 3 dias',
  expiring1: 'Vencendo amanhã',
  expired: 'Já vencidos',
};

const defaultMessage = `Olá {nome}! 👋

Seu plano *{plano}* vence em *{dias} dia(s)* ({vencimento}).

Aproveite para renovar com antecedência e garantir a continuidade dos serviços!

Qualquer dúvida, estamos à disposição. 😊`;

export function BulkDispatcher({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const { clients } = useClients();
  const { getPlanName } = usePlanSettings();
  
  const [messageMode, setMessageMode] = useState<MessageMode>('whatsapp');
  const [sendMode, setSendMode] = useState<SendMode>('immediate');
  const [clientFilter, setClientFilter] = useState<ClientFilter>('expiring7');
  const [customMessage, setCustomMessage] = useState(defaultMessage);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [showClientList, setShowClientList] = useState(false);
  
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });

  // Filter clients based on selection
  const filteredClients = clients.filter(client => {
    const days = getDaysUntilExpiration(client.expiresAt);
    switch (clientFilter) {
      case 'expiring7': return days >= 0 && days <= 7;
      case 'expiring3': return days >= 0 && days <= 3;
      case 'expiring1': return days >= 0 && days <= 1;
      case 'expired': return days < 0;
      default: return true;
    }
  });

  // Auto-select all filtered clients when filter changes
  useEffect(() => {
    setSelectedClientIds(new Set(filteredClients.map(c => c.id)));
  }, [clientFilter, clients]);

  const toggleClient = (id: string) => {
    setSelectedClientIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => setSelectedClientIds(new Set(filteredClients.map(c => c.id)));
  const deselectAll = () => setSelectedClientIds(new Set());

  const handleSend = async () => {
    if (selectedClientIds.size === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }

    if (sendMode === 'scheduled' && !scheduledDate) {
      toast.error('Selecione uma data para o agendamento');
      return;
    }

    const selectedClients = clients.filter(c => selectedClientIds.has(c.id));
    setIsSending(true);
    setProgress({ current: 0, total: selectedClients.length, success: 0, failed: 0 });

    if (sendMode === 'scheduled') {
      // Schedule messages
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const scheduledAt = new Date(scheduledDate!);
      scheduledAt.setHours(hours, minutes, 0, 0);

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedClients.length; i++) {
        const client = selectedClients[i];
        try {
          const { error } = await supabase.from('scheduled_messages').insert({
            user_id: user!.id,
            client_id: client.id,
            message_type: messageMode,
            custom_message: customMessage,
            scheduled_at: scheduledAt.toISOString(),
            status: 'pending',
          });

          if (error) throw error;
          successCount++;
        } catch {
          failCount++;
        }
        setProgress({ current: i + 1, total: selectedClients.length, success: successCount, failed: failCount });
      }

      toast.success(`${successCount} mensagem(ns) agendada(s) para ${format(scheduledAt, "dd/MM 'às' HH:mm")}`);
    } else {
      // Immediate send
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedClients.length; i++) {
        const client = selectedClients[i];
        const planName = getPlanName(client.plan);
        const daysRemaining = getDaysUntilExpiration(client.expiresAt);
        const expiresAtFormatted = format(client.expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

        const personalizedMessage = customMessage
          .replace(/{nome}/g, client.name)
          .replace(/{plano}/g, planName)
          .replace(/{dias}/g, String(Math.abs(daysRemaining)))
          .replace(/{vencimento}/g, expiresAtFormatted);

        if (messageMode === 'whatsapp') {
          await new Promise(resolve => setTimeout(resolve, 500));
          openWhatsApp(client.whatsapp, personalizedMessage);
          successCount++;
        } else {
          try {
            const { error } = await supabase.functions.invoke('send-expiration-reminder', {
              body: {
                clientId: client.id,
                clientName: client.name,
                clientEmail: client.email,
                planName,
                daysRemaining,
                expiresAt: expiresAtFormatted,
              },
            });

            if (error) throw error;
            successCount++;

            // Record notification
            await supabase.from('notification_history').insert({
              client_id: client.id,
              user_id: user!.id,
              notification_type: 'email',
              subject: `Lembrete de vencimento - ${planName}`,
              status: 'sent',
              days_until_expiration: daysRemaining,
            });
          } catch {
            failCount++;
          }
        }
        setProgress({ current: i + 1, total: selectedClients.length, success: successCount, failed: failCount });
      }

      if (messageMode === 'whatsapp') {
        toast.success(`WhatsApp aberto para ${successCount} cliente(s)!`);
      } else {
        if (successCount > 0) toast.success(`${successCount} email(s) enviado(s)!`);
        if (failCount > 0) toast.error(`${failCount} email(s) falhou(aram)`);
      }
    }

    setIsSending(false);
    onComplete?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          Disparador em Massa
        </CardTitle>
        <CardDescription>
          Envie mensagens para múltiplos clientes de uma vez
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Canal de envio</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={messageMode === 'whatsapp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageMode('whatsapp')}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                variant={messageMode === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageMode('email')}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Modo de envio</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={sendMode === 'immediate' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSendMode('immediate')}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Agora
              </Button>
              <Button
                variant={sendMode === 'scheduled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSendMode('scheduled')}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                Agendar
              </Button>
            </div>
          </div>
        </div>

        {/* Client Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Filtrar clientes
          </Label>
          <Select value={clientFilter} onValueChange={(v) => setClientFilter(v as ClientFilter)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(filterLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Clients */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              Clientes selecionados
            </Label>
            <Badge variant="secondary">{selectedClientIds.size} de {filteredClients.length}</Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={() => setShowClientList(!showClientList)}
          >
            <span>Ver lista de clientes</span>
            {showClientList ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showClientList && (
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              <div className="flex gap-2 mb-2">
                <Button variant="outline" size="sm" onClick={selectAll}>Selecionar todos</Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>Limpar seleção</Button>
              </div>
              {filteredClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum cliente encontrado com este filtro
                </p>
              ) : (
                filteredClients.map(client => (
                  <div key={client.id} className="flex items-center gap-2">
                    <Checkbox
                      id={client.id}
                      checked={selectedClientIds.has(client.id)}
                      onCheckedChange={() => toggleClient(client.id)}
                    />
                    <Label htmlFor={client.id} className="text-sm flex-1 cursor-pointer">
                      {client.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({getDaysUntilExpiration(client.expiresAt)}d)
                      </span>
                    </Label>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Schedule Options */}
        {sendMode === 'scheduled' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Data</Label>
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
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Horário</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Message */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Mensagem</Label>
          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={5}
            placeholder="Escreva sua mensagem..."
          />
          <p className="text-xs text-muted-foreground">
            Variáveis: {'{nome}'}, {'{plano}'}, {'{dias}'}, {'{vencimento}'}
          </p>
        </div>

        {/* Progress */}
        {isSending && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso</span>
              <span>{progress.current} de {progress.total}</span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} />
            <div className="flex gap-4 text-xs">
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> {progress.success} sucesso
              </span>
              {progress.failed > 0 && (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {progress.failed} falhas
                </span>
              )}
            </div>
          </div>
        )}

        {/* Send Button */}
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={handleSend}
          disabled={isSending || selectedClientIds.size === 0}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : sendMode === 'scheduled' ? (
            <>
              <Clock className="h-4 w-4" />
              Agendar {selectedClientIds.size} mensagem(ns)
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Enviar para {selectedClientIds.size} cliente(s)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
