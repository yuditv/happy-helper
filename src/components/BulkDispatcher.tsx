import { useState, useEffect, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  ChevronUp,
  Phone,
  Plus,
  X,
  UserPlus,
  Save,
  FolderOpen,
  Trash2,
  Upload,
  FileSpreadsheet
} from 'lucide-react';

interface PhoneGroup {
  id: string;
  name: string;
  phone_numbers: string[];
  created_at: string;
}

type MessageMode = 'whatsapp' | 'email';
type SendMode = 'immediate' | 'scheduled';
type TargetMode = 'clients' | 'numbers';
type ClientFilter = 'all' | 'expiring7' | 'expiring3' | 'expiring1' | 'expired';

const filterLabels: Record<ClientFilter, string> = {
  all: 'Todos os clientes',
  expiring7: 'Vencendo em 7 dias',
  expiring3: 'Vencendo em 3 dias',
  expiring1: 'Vencendo amanhã',
  expired: 'Já vencidos',
};

const defaultMessage = `Olá! 👋

Temos uma oferta especial para você!

Entre em contato para saber mais. 😊`;

const defaultClientMessage = `Olá {nome}! 👋

Seu plano *{plano}* vence em *{dias} dia(s)* ({vencimento}).

Aproveite para renovar com antecedência e garantir a continuidade dos serviços!

Qualquer dúvida, estamos à disposição. 😊`;

export function BulkDispatcher({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const { clients } = useClients();
  const { getPlanName } = usePlanSettings();
  
  const [messageMode, setMessageMode] = useState<MessageMode>('whatsapp');
  const [sendMode, setSendMode] = useState<SendMode>('immediate');
  const [targetMode, setTargetMode] = useState<TargetMode>('clients');
  const [clientFilter, setClientFilter] = useState<ClientFilter>('expiring7');
  const [customMessage, setCustomMessage] = useState(defaultClientMessage);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [showClientList, setShowClientList] = useState(false);
  
  // Custom numbers state
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [newNumber, setNewNumber] = useState('');
  
  // Groups state
  const [phoneGroups, setPhoneGroups] = useState<PhoneGroup[]>([]);
  const [showSaveGroupDialog, setShowSaveGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });

  // Load phone groups
  const fetchPhoneGroups = async () => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      const { data, error } = await supabase
        .from('phone_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPhoneGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchPhoneGroups();
  }, [user]);

  // Update message template when target mode changes
  useEffect(() => {
    if (targetMode === 'numbers') {
      setCustomMessage(defaultMessage);
      setMessageMode('whatsapp'); // Force WhatsApp for custom numbers
    } else {
      setCustomMessage(defaultClientMessage);
    }
  }, [targetMode]);

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

  // Phone number management
  const addPhoneNumber = () => {
    const cleaned = newNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
      toast.error('Número inválido. Use formato: DDD + número');
      return;
    }
    if (phoneNumbers.includes(cleaned)) {
      toast.error('Número já adicionado');
      return;
    }
    setPhoneNumbers(prev => [...prev, cleaned]);
    setNewNumber('');
  };

  const removePhoneNumber = (number: string) => {
    setPhoneNumbers(prev => prev.filter(n => n !== number));
  };

  const formatPhoneDisplay = (number: string) => {
    if (number.length === 11) {
      return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`;
    }
    if (number.length === 10) {
      return `(${number.slice(0, 2)}) ${number.slice(2, 6)}-${number.slice(6)}`;
    }
    return number;
  };

  const parseNumbersFromText = (text: string) => {
    const numbers = text.split(/[\n,;]+/).map(n => n.replace(/\D/g, '')).filter(n => n.length >= 10);
    const uniqueNumbers = [...new Set([...phoneNumbers, ...numbers])];
    setPhoneNumbers(uniqueNumbers);
    toast.success(`${numbers.length} número(s) adicionado(s)`);
  };

  // Group management
  const saveCurrentAsGroup = async () => {
    if (!user || !newGroupName.trim() || phoneNumbers.length === 0) return;
    
    setSavingGroup(true);
    try {
      const { error } = await supabase.from('phone_groups').insert({
        user_id: user.id,
        name: newGroupName.trim(),
        phone_numbers: phoneNumbers,
      });
      
      if (error) throw error;
      
      toast.success('Grupo salvo com sucesso!');
      setNewGroupName('');
      setShowSaveGroupDialog(false);
      fetchPhoneGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error('Erro ao salvar grupo');
    } finally {
      setSavingGroup(false);
    }
  };

  const loadGroup = (groupId: string) => {
    const group = phoneGroups.find(g => g.id === groupId);
    if (group) {
      setPhoneNumbers(group.phone_numbers);
      setSelectedGroupId(groupId);
      toast.success(`Grupo "${group.name}" carregado`);
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('phone_groups')
        .delete()
        .eq('id', groupId);
      
      if (error) throw error;
      
      toast.success('Grupo excluído');
      fetchPhoneGroups();
      if (selectedGroupId === groupId) {
        setSelectedGroupId('');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Erro ao excluir grupo');
    }
  };

  // File import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv' || fileExtension === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const numbers = extractNumbersFromText(text);
        const uniqueNumbers = [...new Set([...phoneNumbers, ...numbers])];
        setPhoneNumbers(uniqueNumbers);
        toast.success(`${numbers.length} número(s) importado(s) do arquivo`);
      };
      reader.readAsText(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // For Excel files, we'll read as text and try to extract numbers
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Simple extraction - read as text and find patterns
          const text = e.target?.result as string;
          const numbers = extractNumbersFromText(text);
          if (numbers.length > 0) {
            const uniqueNumbers = [...new Set([...phoneNumbers, ...numbers])];
            setPhoneNumbers(uniqueNumbers);
            toast.success(`${numbers.length} número(s) importado(s) do arquivo`);
          } else {
            toast.error('Nenhum número encontrado. Use arquivo CSV para melhores resultados.');
          }
        } catch {
          toast.error('Erro ao ler arquivo Excel. Use formato CSV.');
        }
      };
      reader.readAsText(file);
    } else {
      toast.error('Formato não suportado. Use CSV, TXT ou Excel.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const extractNumbersFromText = (text: string): string[] => {
    // Extract phone numbers using regex patterns
    const phonePattern = /\b\d{10,11}\b/g;
    const formattedPattern = /\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g;
    
    const matches1 = text.match(phonePattern) || [];
    const matches2 = (text.match(formattedPattern) || []).map(n => n.replace(/\D/g, ''));
    
    const allMatches = [...matches1, ...matches2];
    return [...new Set(allMatches)].filter(n => n.length >= 10 && n.length <= 11);
  };

  const handleSend = async () => {
    if (targetMode === 'clients' && selectedClientIds.size === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }

    if (targetMode === 'numbers' && phoneNumbers.length === 0) {
      toast.error('Adicione pelo menos um número');
      return;
    }

    if (sendMode === 'scheduled' && !scheduledDate) {
      toast.error('Selecione uma data para o agendamento');
      return;
    }

    if (targetMode === 'numbers') {
      // Send to custom phone numbers
      setIsSending(true);
      setProgress({ current: 0, total: phoneNumbers.length, success: 0, failed: 0 });

      let successCount = 0;

      for (let i = 0; i < phoneNumbers.length; i++) {
        const number = phoneNumbers[i];
        await new Promise(resolve => setTimeout(resolve, 500));
        openWhatsApp(number, customMessage);
        successCount++;
        setProgress({ current: i + 1, total: phoneNumbers.length, success: successCount, failed: 0 });
      }

      toast.success(`WhatsApp aberto para ${successCount} número(s)!`);
      setIsSending(false);
      onComplete?.();
      return;
    }

    // Original client-based logic
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
          Envie mensagens para clientes ou números personalizados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Target Mode Selection */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Enviar para</Label>
          <Tabs value={targetMode} onValueChange={(v) => setTargetMode(v as TargetMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="clients" className="gap-2">
                <Users className="h-4 w-4" />
                Meus Clientes
              </TabsTrigger>
              <TabsTrigger value="numbers" className="gap-2">
                <Phone className="h-4 w-4" />
                Números Avulsos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Mode Selection - only show email option for clients */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Canal de envio</Label>
            <div className={cn("grid gap-2", targetMode === 'clients' ? "grid-cols-2" : "grid-cols-1")}>
              <Button
                variant={messageMode === 'whatsapp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageMode('whatsapp')}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              {targetMode === 'clients' && (
                <Button
                  variant={messageMode === 'email' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMessageMode('email')}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              )}
            </div>
          </div>
          {targetMode === 'clients' && (
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
          )}
        </div>

        {/* Custom Numbers Section */}
        {targetMode === 'numbers' && (
          <div className="space-y-4">
            {/* Load saved group */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />
                Carregar grupo salvo
              </Label>
              <div className="flex gap-2">
                <Select value={selectedGroupId} onValueChange={loadGroup}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={loadingGroups ? "Carregando..." : "Selecione um grupo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {phoneGroups.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhum grupo salvo</SelectItem>
                    ) : (
                      phoneGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} ({group.phone_numbers.length} números)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedGroupId && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteGroup(selectedGroupId)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Import from file */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" />
                Importar arquivo
              </Label>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileImport}
                  accept=".csv,.txt,.xlsx,.xls"
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Importar CSV/Excel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Suporta arquivos CSV, TXT ou Excel com números de telefone
              </p>
            </div>

            {/* Add individual number */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Adicionar número
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="(11) 99999-9999"
                  onKeyDown={(e) => e.key === 'Enter' && addPhoneNumber()}
                />
                <Button onClick={addPhoneNumber} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Bulk add numbers */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Adicionar vários números</Label>
              <Textarea
                placeholder="Cole aqui vários números separados por vírgula, ponto e vírgula ou quebra de linha..."
                rows={3}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    parseNumbersFromText(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
            </div>

            {/* Numbers List */}
            {phoneNumbers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Números adicionados
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{phoneNumbers.length}</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowSaveGroupDialog(true)}
                      className="h-6 px-2 gap-1"
                    >
                      <Save className="h-3 w-3" />
                      Salvar grupo
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setPhoneNumbers([]);
                        setSelectedGroupId('');
                      }}
                      className="text-destructive hover:text-destructive h-6 px-2"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                <div className="border rounded-lg p-3 max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {phoneNumbers.map((number) => (
                    <Badge key={number} variant="secondary" className="gap-1 pr-1">
                      {formatPhoneDisplay(number)}
                      <button
                        onClick={() => removePhoneNumber(number)}
                        className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Client Selection Section */}
        {targetMode === 'clients' && (
          <>
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
          </>
        )}

        {/* Schedule Options */}
        {sendMode === 'scheduled' && targetMode === 'clients' && (
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
            {targetMode === 'clients' 
              ? <>Variáveis: {'{nome}'}, {'{plano}'}, {'{dias}'}, {'{vencimento}'}</>
              : 'Escreva a mensagem que será enviada para todos os números'
            }
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
          disabled={isSending || (targetMode === 'clients' ? selectedClientIds.size === 0 : phoneNumbers.length === 0)}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : targetMode === 'numbers' ? (
            <>
              <Send className="h-4 w-4" />
              Enviar para {phoneNumbers.length} número(s)
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

      {/* Save Group Dialog */}
      <Dialog open={showSaveGroupDialog} onOpenChange={setShowSaveGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Grupo de Números</DialogTitle>
            <DialogDescription>
              Salve esta lista de {phoneNumbers.length} número(s) como um grupo reutilizável.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do grupo</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ex: Clientes região Sul"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveGroupDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={saveCurrentAsGroup} 
              disabled={!newGroupName.trim() || savingGroup}
            >
              {savingGroup ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
