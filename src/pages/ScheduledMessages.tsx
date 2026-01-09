import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  MessageCircle, 
  Send, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Loader2,
  Bell,
  BellOff,
  Repeat,
  BarChart3
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageReport } from '@/components/MessageReport';
import { MessageTemplatesTab } from '@/components/MessageTemplatesTab';
import { FileText } from 'lucide-react';

interface ScheduledMessage {
  id: string;
  client_id: string;
  message_type: 'whatsapp' | 'email';
  custom_message: string | null;
  scheduled_at: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrence_end_date?: string | null;
  client?: {
    name: string;
    email: string;
    whatsapp: string;
  };
}

const recurrenceLabels: Record<string, string> = {
  none: 'Sem repetição',
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

export default function ScheduledMessages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ScheduledMessage | null>(null);
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editTime, setEditTime] = useState('09:00');
  const [editCustomMessage, setEditCustomMessage] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed' | 'cancelled'>('all');

  useEffect(() => {
    if (user) {
      fetchMessages();
      checkNotificationPermission();
    }
  }, [user]);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Seu navegador não suporta notificações');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    
    if (permission === 'granted') {
      toast.success('Notificações ativadas!');
      // Test notification
      new Notification('Notificações ativadas!', {
        body: 'Você receberá alertas quando mensagens agendadas forem enviadas.',
        icon: '/favicon.ico'
      });
    } else {
      toast.error('Permissão de notificação negada');
    }
  };

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select(`
          *,
          client:clients(name, email, whatsapp)
        `)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setMessages((data as unknown as ScheduledMessage[]) || []);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('scheduled-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scheduled_messages'
        },
        (payload) => {
          const updated = payload.new as ScheduledMessage;
          
          // Show notification if message was sent
          if (updated.status === 'sent' && notificationsEnabled) {
            const msg = messages.find(m => m.id === updated.id);
            if (msg?.client) {
              new Notification('Mensagem enviada!', {
                body: `${msg.message_type === 'email' ? 'Email' : 'WhatsApp'} enviado para ${msg.client.name}`,
                icon: '/favicon.ico'
              });
            }
          }
          
          // Update local state
          setMessages(prev => prev.map(m => 
            m.id === updated.id ? { ...m, ...updated } : m
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, notificationsEnabled, messages]);

  const openEditDialog = (message: ScheduledMessage) => {
    setEditingMessage(message);
    setEditDate(new Date(message.scheduled_at));
    const time = format(new Date(message.scheduled_at), 'HH:mm');
    setEditTime(time);
    setEditCustomMessage(message.custom_message || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editDate) return;

    const [hours, minutes] = editTime.split(':').map(Number);
    const scheduledAt = new Date(editDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .update({
          scheduled_at: scheduledAt.toISOString(),
          custom_message: editCustomMessage || null,
        })
        .eq('id', editingMessage.id);

      if (error) throw error;

      toast.success('Agendamento atualizado!');
      setEditDialogOpen(false);
      fetchMessages();
    } catch (error) {
      console.error('Error updating scheduled message:', error);
      toast.error('Erro ao atualizar agendamento');
    }
  };

  const handleCancelMessage = async () => {
    if (!messageToDelete) return;

    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .update({ status: 'cancelled' })
        .eq('id', messageToDelete.id);

      if (error) throw error;

      toast.success('Agendamento cancelado!');
      setDeleteDialogOpen(false);
      fetchMessages();
    } catch (error) {
      console.error('Error cancelling scheduled message:', error);
      toast.error('Erro ao cancelar agendamento');
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', messageToDelete.id);

      if (error) throw error;

      toast.success('Agendamento excluído!');
      setDeleteDialogOpen(false);
      fetchMessages();
    } catch (error) {
      console.error('Error deleting scheduled message:', error);
      toast.error('Erro ao excluir agendamento');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-amber-500/50 text-amber-500"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'sent':
        return <Badge variant="outline" className="border-green-500/50 text-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Enviado</Badge>;
      case 'failed':
        return <Badge variant="outline" className="border-red-500/50 text-red-500"><XCircle className="h-3 w-3 mr-1" /> Falhou</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-gray-500/50 text-gray-500"><AlertCircle className="h-3 w-3 mr-1" /> Cancelado</Badge>;
      default:
        return null;
    }
  };

  const filteredMessages = messages.filter(m => filter === 'all' || m.status === filter);

  const pendingCount = messages.filter(m => m.status === 'pending').length;
  const sentCount = messages.filter(m => m.status === 'sent').length;
  const failedCount = messages.filter(m => m.status === 'failed').length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gradient">Mensagens Agendadas</h1>
                <p className="text-sm text-muted-foreground">Gerencie seus envios programados</p>
              </div>
            </div>
            <Button
              variant={notificationsEnabled ? "outline" : "default"}
              size="sm"
              onClick={requestNotificationPermission}
              className="gap-2"
            >
              {notificationsEnabled ? (
                <>
                  <Bell className="h-4 w-4" />
                  Notificações ativas
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" />
                  Ativar notificações
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Tabs defaultValue="messages" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="messages" className="gap-2">
              <Clock className="h-4 w-4" />
              Agendamentos
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Relatório
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter('all')}>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{messages.length}</div>
                  <p className="text-sm text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card className={cn("cursor-pointer hover:border-amber-500/50 transition-colors", filter === 'pending' && "border-amber-500")} onClick={() => setFilter('pending')}>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </CardContent>
              </Card>
              <Card className={cn("cursor-pointer hover:border-green-500/50 transition-colors", filter === 'sent' && "border-green-500")} onClick={() => setFilter('sent')}>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-500">{sentCount}</div>
                  <p className="text-sm text-muted-foreground">Enviados</p>
                </CardContent>
              </Card>
              <Card className={cn("cursor-pointer hover:border-red-500/50 transition-colors", filter === 'failed' && "border-red-500")} onClick={() => setFilter('failed')}>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-500">{failedCount}</div>
                  <p className="text-sm text-muted-foreground">Falharam</p>
                </CardContent>
              </Card>
            </div>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum agendamento encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {filter === 'all' 
                  ? 'Você ainda não agendou nenhuma mensagem.'
                  : `Nenhuma mensagem com status "${filter}".`}
              </p>
              <Button onClick={() => navigate('/')}>
                Voltar ao painel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((message) => (
              <Card key={message.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                        message.message_type === 'whatsapp' ? "bg-green-500/10" : "bg-blue-500/10"
                      )}>
                        {message.message_type === 'whatsapp' ? (
                          <MessageCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Send className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{message.client?.name || 'Cliente removido'}</span>
                          {getStatusBadge(message.status)}
                          {message.recurrence_type && message.recurrence_type !== 'none' && (
                            <Badge variant="outline" className="border-purple-500/50 text-purple-500 text-xs">
                              <Repeat className="h-3 w-3 mr-1" />
                              {recurrenceLabels[message.recurrence_type]}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {message.message_type === 'whatsapp' ? message.client?.whatsapp : message.client?.email}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {format(new Date(message.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {message.recurrence_end_date && (
                            <span className="flex items-center gap-1">
                              <Repeat className="h-3 w-3" />
                              Até: {format(new Date(message.recurrence_end_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                          {message.sent_at && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Enviado: {format(new Date(message.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                        {message.error_message && (
                          <p className="text-xs text-red-500 mt-2">Erro: {message.error_message}</p>
                        )}
                        {message.custom_message && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 bg-muted/50 p-2 rounded">
                            {message.custom_message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {message.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(message)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setMessageToDelete(message);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>

          <TabsContent value="templates">
            <MessageTemplatesTab />
          </TabsContent>

          <TabsContent value="report">
            <MessageReport />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>
              Altere a data, horário ou mensagem do agendamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDate ? format(editDate, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editDate}
                      onSelect={setEditDate}
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
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mensagem personalizada</Label>
              <Textarea
                value={editCustomMessage}
                onChange={(e) => setEditCustomMessage(e.target.value)}
                rows={4}
                placeholder="Mensagem personalizada (opcional)"
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete/Cancel Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Agendamento</DialogTitle>
            <DialogDescription>
              O que você deseja fazer com este agendamento?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Cliente:</strong> {messageToDelete?.client?.name}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Agendado para:</strong>{' '}
              {messageToDelete && format(new Date(messageToDelete.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="w-full sm:w-auto">
              Voltar
            </Button>
            <Button variant="secondary" onClick={handleCancelMessage} className="w-full sm:w-auto">
              Cancelar agendamento
            </Button>
            <Button variant="destructive" onClick={handleDeleteMessage} className="w-full sm:w-auto">
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
