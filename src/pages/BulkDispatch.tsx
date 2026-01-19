import { useState, useMemo } from 'react';
import { useClients } from '@/hooks/useClients';
import { useDispatchHistory } from '@/hooks/useDispatchHistory';
import { Client, planLabels, getExpirationStatus, getDaysUntilExpiration } from '@/types/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Send, 
  Users, 
  MessageSquare, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Search,
  Clock,
  Zap,
  Phone,
  RefreshCw,
  CalendarDays,
  FileText,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WhatsAppTemplateManager } from '@/components/WhatsAppTemplateManager';
import { ScheduleDispatch } from '@/components/ScheduleDispatch';
import { ScheduledDispatchList } from '@/components/ScheduledDispatchList';
import { DispatchHistoryPanel } from '@/components/DispatchHistoryPanel';

interface DispatchResult {
  clientId: string;
  clientName: string;
  phone: string;
  success: boolean;
  error?: string;
}

type FilterType = 'all' | 'active' | 'expiring' | 'expired';

export default function BulkDispatch() {
  const { clients, isLoading: isLoadingClients } = useClients();
  const { saveDispatch } = useDispatchHistory();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('dispatch');
  
  // Selection state
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  
  // Message state
  const [message, setMessage] = useState('');
  const [messageVariables] = useState([
    { key: '{nome}', description: 'Nome do cliente' },
    { key: '{plano}', description: 'Plano atual' },
    { key: '{vencimento}', description: 'Data de vencimento' },
    { key: '{dias}', description: 'Dias até vencimento' },
  ]);
  
  // Dispatch state
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResults, setDispatchResults] = useState<DispatchResult[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [delayBetweenMessages, setDelayBetweenMessages] = useState(3);
  
  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.whatsapp.includes(searchTerm);
      
      if (!matchesSearch) return false;
      
      const status = getExpirationStatus(client.expiresAt);
      switch (filterType) {
        case 'active':
          return status === 'active';
        case 'expiring':
          return status === 'expiring';
        case 'expired':
          return status === 'expired';
        default:
          return true;
      }
    });
  }, [clients, searchTerm, filterType]);

  // Get selected clients as array
  const selectedClientsArray = useMemo(() => {
    return clients.filter(c => selectedClients.has(c.id) && c.whatsapp);
  }, [clients, selectedClients]);
  
  // Selection helpers
  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };
  
  const selectAll = () => {
    const allIds = new Set(filteredClients.filter(c => c.whatsapp).map(c => c.id));
    setSelectedClients(allIds);
  };
  
  const clearSelection = () => {
    setSelectedClients(new Set());
  };
  
  const isAllSelected = filteredClients.filter(c => c.whatsapp).length > 0 && 
    filteredClients.filter(c => c.whatsapp).every(c => selectedClients.has(c.id));
  
  // Replace variables in message
  const replaceVariables = (text: string, client: Client): string => {
    const days = getDaysUntilExpiration(client.expiresAt);
    return text
      .replace(/{nome}/g, client.name)
      .replace(/{plano}/g, planLabels[client.plan])
      .replace(/{vencimento}/g, format(client.expiresAt, "dd/MM/yyyy", { locale: ptBR }))
      .replace(/{dias}/g, days.toString());
  };
  
  // Send messages
  const handleDispatch = async () => {
    if (selectedClients.size === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }
    
    if (!message.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }
    
    const selectedClientsList = clients.filter(c => selectedClients.has(c.id) && c.whatsapp);
    
    if (selectedClientsList.length === 0) {
      toast.error('Nenhum cliente selecionado possui WhatsApp');
      return;
    }
    
    setIsDispatching(true);
    setDispatchResults([]);
    setCurrentProgress(0);
    
    const results: DispatchResult[] = [];
    
    for (let i = 0; i < selectedClientsList.length; i++) {
      const client = selectedClientsList[i];
      const personalizedMessage = replaceVariables(message, client);
      
      try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp-uazapi', {
          body: {
            phone: client.whatsapp,
            message: personalizedMessage,
          },
        });
        
        if (error) throw error;
        
        results.push({
          clientId: client.id,
          clientName: client.name,
          phone: client.whatsapp,
          success: true,
        });
      } catch (error: any) {
        console.error(`Error sending to ${client.name}:`, error);
        results.push({
          clientId: client.id,
          clientName: client.name,
          phone: client.whatsapp,
          success: false,
          error: error.message || 'Erro ao enviar',
        });
      }
      
      setDispatchResults([...results]);
      setCurrentProgress(((i + 1) / selectedClientsList.length) * 100);
      
      if (i < selectedClientsList.length - 1 && delayBetweenMessages > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages * 1000));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    // Save dispatch history
    await saveDispatch(
      'whatsapp',
      'clients',
      results.length,
      successCount,
      failCount,
      message,
      filterType !== 'all' ? filterType : undefined
    );
    
    if (successCount > 0 && failCount === 0) {
      toast.success(`${successCount} mensagem(ns) enviada(s) com sucesso!`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`${successCount} enviada(s), ${failCount} falhou(aram)`);
    } else {
      toast.error('Falha ao enviar mensagens');
    }
    
    setIsDispatching(false);
    clearSelection();
  };
  
  const getStatusBadge = (client: Client) => {
    const status = getExpirationStatus(client.expiresAt);
    const days = getDaysUntilExpiration(client.expiresAt);
    
    if (status === 'expired') {
      return <Badge variant="destructive" className="text-xs">Expirado</Badge>;
    }
    if (status === 'expiring') {
      return <Badge variant="outline" className="text-xs border-warning text-warning">{days}d</Badge>;
    }
    return <Badge variant="outline" className="text-xs border-success text-success">Ativo</Badge>;
  };

  const handleTemplateSelect = (content: string) => {
    setMessage(content);
    toast.success('Template aplicado!');
  };
  
  if (isLoadingClients) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Client selection panel (shared across tabs)
  const ClientSelectionPanel = () => (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Selecionar Clientes
        </CardTitle>
        <CardDescription>
          {selectedClients.size} de {filteredClients.filter(c => c.whatsapp).length} selecionado(s)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente..."
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="expiring">Vencendo</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Select All / Clear */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={isAllSelected ? clearSelection : selectAll}
            className="text-xs"
          >
            {isAllSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </Button>
          {selectedClients.size > 0 && (
            <Badge variant="secondary">{selectedClients.size} selecionado(s)</Badge>
          )}
        </div>
        
        {/* Client List */}
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-2">
            {filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum cliente encontrado</p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedClients.has(client.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border/50 hover:border-primary/50'
                  } ${!client.whatsapp ? 'opacity-50' : ''}`}
                  onClick={() => client.whatsapp && toggleClient(client.id)}
                >
                  <Checkbox
                    checked={selectedClients.has(client.id)}
                    disabled={!client.whatsapp}
                    onCheckedChange={() => client.whatsapp && toggleClient(client.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{client.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{client.whatsapp || 'Sem WhatsApp'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(client)}
                    <span className="text-xs text-muted-foreground">
                      {planLabels[client.plan]}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Send className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gradient">Disparo em Massa</h1>
          <p className="text-sm text-muted-foreground">Envie mensagens via WhatsApp para múltiplos clientes</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="dispatch" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Disparo</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Agendar</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* Dispatch Tab */}
        <TabsContent value="dispatch" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClientSelectionPanel />
            
            <div className="space-y-6">
              {/* Message Card */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Mensagem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="min-h-[180px] resize-none"
                    disabled={isDispatching}
                  />
                  
                  {/* Variables */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Variáveis disponíveis:</Label>
                    <div className="flex flex-wrap gap-2">
                      {messageVariables.map((v) => (
                        <Badge
                          key={v.key}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => setMessage(prev => prev + v.key)}
                        >
                          {v.key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Delay setting */}
                  <div className="flex items-center gap-4">
                    <Label className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Delay entre mensagens:
                    </Label>
                    <Select 
                      value={delayBetweenMessages.toString()} 
                      onValueChange={(v) => setDelayBetweenMessages(parseInt(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1s</SelectItem>
                        <SelectItem value="2">2s</SelectItem>
                        <SelectItem value="3">3s</SelectItem>
                        <SelectItem value="5">5s</SelectItem>
                        <SelectItem value="10">10s</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Send Button */}
                  <Button
                    onClick={handleDispatch}
                    disabled={isDispatching || selectedClients.size === 0 || !message.trim()}
                    className="w-full gap-2 h-12 text-base"
                  >
                    {isDispatching ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Enviando... ({Math.round(currentProgress)}%)
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        Disparar para {selectedClients.size} cliente(s)
                      </>
                    )}
                  </Button>
                  
                  {/* Progress */}
                  {isDispatching && (
                    <Progress value={currentProgress} className="h-2" />
                  )}
                </CardContent>
              </Card>
              
              {/* Results Card */}
              {dispatchResults.length > 0 && (
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-primary" />
                        Resultados
                      </span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="border-success text-success">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {dispatchResults.filter(r => r.success).length}
                        </Badge>
                        <Badge variant="outline" className="border-destructive text-destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          {dispatchResults.filter(r => !r.success).length}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {dispatchResults.map((result, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-3 p-2 rounded-lg text-sm ${
                              result.success ? 'bg-success/10' : 'bg-destructive/10'
                            }`}
                          >
                            {result.success ? (
                              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{result.clientName}</p>
                              <p className="text-xs text-muted-foreground">{result.phone}</p>
                            </div>
                            {result.error && (
                              <span className="text-xs text-destructive">{result.error}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WhatsAppTemplateManager onSelectTemplate={handleTemplateSelect} />
            
            {/* Preview Card */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Mensagem Atual
                </CardTitle>
                <CardDescription>
                  Clique em um template para usá-lo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Selecione um template ou digite sua mensagem..."
                  className="min-h-[200px] resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  {messageVariables.map((v) => (
                    <Badge
                      key={v.key}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => setMessage(prev => prev + v.key)}
                    >
                      {v.key}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClientSelectionPanel />
            
            <div className="space-y-6">
              <ScheduleDispatch 
                selectedClients={selectedClientsArray}
                message={message}
                onMessageChange={setMessage}
              />
              <ScheduledDispatchList />
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <DispatchHistoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
