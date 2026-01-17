import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  History,
  MessageCircle,
  Mail,
  Users,
  Phone,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  BarChart3,
  CalendarIcon,
  ArrowLeft,
  Clock,
  Pause,
  Image,
  FileText,
  TrendingUp,
  Filter,
  Download,
  Timer,
  Zap,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DispatchMetadata {
  delay_seconds?: number;
  pause_after_count?: number;
  auto_pause_enabled?: boolean;
  total_pauses?: number;
  send_duration_seconds?: number;
  had_media?: boolean;
  variations_used?: boolean;
  variations_count?: number;
  media_count?: number;
}

interface DispatchRecord {
  id: string;
  dispatch_type: string;
  target_type: string;
  total_recipients: number;
  success_count: number;
  failed_count: number;
  message_content: string | null;
  client_filter: string | null;
  created_at: string;
  metadata?: DispatchMetadata;
}

export default function DispatchHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<DispatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DispatchRecord | null>(null);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bulk_dispatch_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse metadata from JSON and cast to our interface
      const parsedData: DispatchRecord[] = (data || []).map(record => {
        const rawMetadata = (record as unknown as { metadata?: unknown }).metadata;
        return {
          id: record.id,
          dispatch_type: record.dispatch_type,
          target_type: record.target_type,
          total_recipients: record.total_recipients,
          success_count: record.success_count,
          failed_count: record.failed_count,
          message_content: record.message_content,
          client_filter: record.client_filter,
          created_at: record.created_at,
          metadata: typeof rawMetadata === 'string' 
            ? JSON.parse(rawMetadata) 
            : rawMetadata as DispatchMetadata | undefined
        };
      });
      
      setHistory(parsedData);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bulk_dispatch_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  // Filter data based on date range and filters
  const filteredHistory = useMemo(() => {
    return history.filter(record => {
      // Date filter
      if (dateFrom && dateTo) {
        const recordDate = parseISO(record.created_at);
        if (!isWithinInterval(recordDate, { start: dateFrom, end: dateTo })) {
          return false;
        }
      }

      // Type filter
      if (filterType !== 'all' && record.dispatch_type !== filterType) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        const successRate = record.total_recipients > 0 
          ? (record.success_count / record.total_recipients) * 100 
          : 0;
        if (filterStatus === 'success' && successRate < 90) return false;
        if (filterStatus === 'partial' && (successRate >= 90 || successRate < 50)) return false;
        if (filterStatus === 'failed' && successRate >= 50) return false;
      }

      // Search filter
      if (searchTerm && !record.message_content?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [history, dateFrom, dateTo, filterType, filterStatus, searchTerm]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDispatches = filteredHistory.length;
    const totalMessages = filteredHistory.reduce((acc, d) => acc + d.total_recipients, 0);
    const totalSuccess = filteredHistory.reduce((acc, d) => acc + d.success_count, 0);
    const totalFailed = filteredHistory.reduce((acc, d) => acc + d.failed_count, 0);
    const avgSuccessRate = totalMessages > 0 ? Math.round((totalSuccess / totalMessages) * 100) : 0;
    
    // Time statistics
    const totalDuration = filteredHistory.reduce((acc, d) => {
      return acc + (d.metadata?.send_duration_seconds || 0);
    }, 0);
    
    const totalPauses = filteredHistory.reduce((acc, d) => {
      return acc + (d.metadata?.total_pauses || 0);
    }, 0);

    const withMedia = filteredHistory.filter(d => d.metadata?.had_media).length;
    const withVariations = filteredHistory.filter(d => d.metadata?.variations_used).length;

    return {
      totalDispatches,
      totalMessages,
      totalSuccess,
      totalFailed,
      avgSuccessRate,
      totalDuration,
      totalPauses,
      withMedia,
      withVariations,
    };
  }, [filteredHistory]);

  const getSuccessRate = (success: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((success / total) * 100);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
  };

  const filterLabels: Record<string, string> = {
    all: 'Todos',
    expiring7: '7 dias',
    expiring3: '3 dias',
    expiring1: '1 dia',
    expired: 'Vencidos',
  };

  const setQuickDate = (period: string) => {
    const now = new Date();
    switch (period) {
      case 'today':
        setDateFrom(new Date(now.setHours(0, 0, 0, 0)));
        setDateTo(new Date());
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setDateFrom(weekAgo);
        setDateTo(new Date());
        break;
      case 'month':
        setDateFrom(startOfMonth(now));
        setDateTo(endOfMonth(now));
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setDateFrom(startOfMonth(lastMonth));
        setDateTo(endOfMonth(lastMonth));
        break;
      case 'all':
        setDateFrom(undefined);
        setDateTo(undefined);
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <History className="h-5 w-5 text-white" />
                </div>
                Histórico de Disparos
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Visualize e analise todos os envios em massa realizados
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick date filters */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickDate('today')}>
                Hoje
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDate('week')}>
                Últimos 7 dias
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDate('month')}>
                Este mês
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDate('lastMonth')}>
                Mês passado
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDate('all')}>
                Todo período
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Date From */}
              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label>Data final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Type filter */}
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="success">Sucesso (≥90%)</SelectItem>
                    <SelectItem value="partial">Parcial (50-89%)</SelectItem>
                    <SelectItem value="failed">Falha (&lt;50%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <Label>Buscar mensagem</Label>
                <Input
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <BarChart3 className="h-4 w-4" />
                Total Disparos
              </div>
              <p className="text-3xl font-bold mt-2">{stats.totalDispatches}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <MessageCircle className="h-4 w-4" />
                Mensagens Enviadas
              </div>
              <p className="text-3xl font-bold mt-2">{stats.totalMessages}</p>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600 text-xs">
                <CheckCircle className="h-4 w-4" />
                Taxa de Sucesso
              </div>
              <p className="text-3xl font-bold mt-2 text-green-600">{stats.avgSuccessRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalSuccess} de {stats.totalMessages}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Timer className="h-4 w-4" />
                Tempo Total
              </div>
              <p className="text-3xl font-bold mt-2">{formatDuration(stats.totalDuration)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Zap className="h-4 w-4" />
                Recursos Usados
              </div>
              <div className="flex gap-3 mt-2">
                <div className="text-center">
                  <p className="text-xl font-bold">{stats.withMedia}</p>
                  <p className="text-xs text-muted-foreground">c/ mídia</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{stats.withVariations}</p>
                  <p className="text-xs text-muted-foreground">c/ variações</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Registros ({filteredHistory.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum disparo encontrado</p>
                <p className="text-sm mt-1">Ajuste os filtros ou realize um novo disparo</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Destinatários</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Config.</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((record) => {
                      const successRate = getSuccessRate(record.success_count, record.total_recipients);
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {format(parseISO(record.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(record.created_at), 'HH:mm', { locale: ptBR })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant={record.dispatch_type === 'whatsapp' ? 'default' : 'secondary'}>
                                {record.dispatch_type === 'whatsapp' ? (
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <Mail className="h-3 w-3 mr-1" />
                                )}
                                {record.dispatch_type === 'whatsapp' ? 'WhatsApp' : 'Email'}
                              </Badge>
                              {record.metadata?.had_media && (
                                <Badge variant="outline" className="text-xs">
                                  <Image className="h-3 w-3 mr-1" />
                                  Mídia
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {record.target_type === 'clients' ? (
                                <Users className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Phone className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium">{record.total_recipients}</span>
                              {record.client_filter && record.client_filter !== 'all' && (
                                <Badge variant="outline" className="text-xs ml-1">
                                  {filterLabels[record.client_filter] || record.client_filter}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 flex items-center gap-1 text-sm">
                                  <CheckCircle className="h-3 w-3" />
                                  {record.success_count}
                                </span>
                                {record.failed_count > 0 && (
                                  <span className="text-red-600 flex items-center gap-1 text-sm">
                                    <XCircle className="h-3 w-3" />
                                    {record.failed_count}
                                  </span>
                                )}
                              </div>
                              <Badge 
                                variant={successRate >= 90 ? 'default' : successRate >= 50 ? 'secondary' : 'destructive'}
                                className="text-xs"
                              >
                                {successRate}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.metadata?.send_duration_seconds ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {formatDuration(record.metadata.send_duration_seconds)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                            {record.metadata?.total_pauses && record.metadata.total_pauses > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Pause className="h-3 w-3" />
                                {record.metadata.total_pauses} pausa(s)
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {record.metadata?.delay_seconds && (
                                <div>Delay: {record.metadata.delay_seconds}s</div>
                              )}
                              {record.metadata?.pause_after_count && record.metadata.auto_pause_enabled && (
                                <div>Pausa: {record.metadata.pause_after_count}</div>
                              )}
                              {record.metadata?.variations_used && (
                                <Badge variant="outline" className="text-xs">
                                  <FileText className="h-3 w-3 mr-1" />
                                  {record.metadata.variations_count || 0} var
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedRecord(record)}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Detalhes do Disparo</DialogTitle>
                                    <DialogDescription>
                                      {format(parseISO(record.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-3 rounded-lg bg-muted/50">
                                        <p className="text-xs text-muted-foreground">Total enviado</p>
                                        <p className="text-xl font-bold">{record.total_recipients}</p>
                                      </div>
                                      <div className="p-3 rounded-lg bg-green-500/10">
                                        <p className="text-xs text-green-600">Taxa de sucesso</p>
                                        <p className="text-xl font-bold text-green-600">
                                          {getSuccessRate(record.success_count, record.total_recipients)}%
                                        </p>
                                      </div>
                                    </div>

                                    {record.metadata && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">Configurações utilizadas:</p>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                          {record.metadata.delay_seconds && (
                                            <div className="p-2 rounded bg-muted/50">
                                              <p className="text-xs text-muted-foreground">Delay</p>
                                              <p>{record.metadata.delay_seconds} segundos</p>
                                            </div>
                                          )}
                                          {record.metadata.send_duration_seconds && (
                                            <div className="p-2 rounded bg-muted/50">
                                              <p className="text-xs text-muted-foreground">Duração total</p>
                                              <p>{formatDuration(record.metadata.send_duration_seconds)}</p>
                                            </div>
                                          )}
                                          {record.metadata.auto_pause_enabled && (
                                            <div className="p-2 rounded bg-muted/50">
                                              <p className="text-xs text-muted-foreground">Pausa automática</p>
                                              <p>A cada {record.metadata.pause_after_count} mensagens</p>
                                            </div>
                                          )}
                                          {record.metadata.total_pauses !== undefined && record.metadata.total_pauses > 0 && (
                                            <div className="p-2 rounded bg-muted/50">
                                              <p className="text-xs text-muted-foreground">Total de pausas</p>
                                              <p>{record.metadata.total_pauses}</p>
                                            </div>
                                          )}
                                          {record.metadata.media_count !== undefined && record.metadata.media_count > 0 && (
                                            <div className="p-2 rounded bg-muted/50">
                                              <p className="text-xs text-muted-foreground">Mídias anexadas</p>
                                              <p>{record.metadata.media_count}</p>
                                            </div>
                                          )}
                                          {record.metadata.variations_count !== undefined && record.metadata.variations_count > 0 && (
                                            <div className="p-2 rounded bg-muted/50">
                                              <p className="text-xs text-muted-foreground">Variações</p>
                                              <p>{record.metadata.variations_count}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {record.message_content && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">Mensagem enviada:</p>
                                        <div className="p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                                          {record.message_content}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => deleteRecord(record.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
