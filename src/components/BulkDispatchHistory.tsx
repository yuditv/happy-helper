import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
} from 'lucide-react';

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
}

export function BulkDispatchHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<DispatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDispatches: 0,
    totalMessages: 0,
    totalSuccess: 0,
    totalFailed: 0,
  });

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bulk_dispatch_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);

      // Calculate stats
      const totalDispatches = data?.length || 0;
      const totalMessages = data?.reduce((acc, d) => acc + d.total_recipients, 0) || 0;
      const totalSuccess = data?.reduce((acc, d) => acc + d.success_count, 0) || 0;
      const totalFailed = data?.reduce((acc, d) => acc + d.failed_count, 0) || 0;
      setStats({ totalDispatches, totalMessages, totalSuccess, totalFailed });
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

  const getSuccessRate = (success: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((success / total) * 100);
  };

  const filterLabels: Record<string, string> = {
    all: 'Todos',
    expiring7: '7 dias',
    expiring3: '3 dias',
    expiring1: '1 dia',
    expired: 'Vencidos',
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <History className="h-4 w-4 text-white" />
          </div>
          Histórico de Disparos
        </CardTitle>
        <CardDescription>
          Acompanhe todos os envios em massa realizados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <BarChart3 className="h-3 w-3" />
              Total Disparos
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalDispatches}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <MessageCircle className="h-3 w-3" />
              Mensagens
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalMessages}</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10">
            <div className="flex items-center gap-2 text-green-600 text-xs">
              <CheckCircle className="h-3 w-3" />
              Sucesso
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.totalSuccess}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10">
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <XCircle className="h-3 w-3" />
              Falhas
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.totalFailed}</p>
          </div>
        </div>

        {/* History List */}
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum disparo realizado ainda</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
              {history.map((record) => {
                const successRate = getSuccessRate(record.success_count, record.total_recipients);
                return (
                  <div
                    key={record.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={record.dispatch_type === 'whatsapp' ? 'default' : 'secondary'}>
                            {record.dispatch_type === 'whatsapp' ? (
                              <MessageCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Mail className="h-3 w-3 mr-1" />
                            )}
                            {record.dispatch_type === 'whatsapp' ? 'WhatsApp' : 'Email'}
                          </Badge>
                          <Badge variant="outline">
                            {record.target_type === 'clients' ? (
                              <Users className="h-3 w-3 mr-1" />
                            ) : (
                              <Phone className="h-3 w-3 mr-1" />
                            )}
                            {record.target_type === 'clients' ? 'Clientes' : 'Números'}
                          </Badge>
                          {record.client_filter && record.client_filter !== 'all' && (
                            <Badge variant="outline" className="text-xs">
                              {filterLabels[record.client_filter] || record.client_filter}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {record.total_recipients} destinatário(s)
                          </span>
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {record.success_count}
                          </span>
                          {record.failed_count > 0 && (
                            <span className="text-red-600 flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              {record.failed_count}
                            </span>
                          )}
                          <Badge 
                            variant={successRate >= 90 ? 'default' : successRate >= 70 ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {successRate}% sucesso
                          </Badge>
                        </div>

                        {record.message_content && (
                          <p className="text-xs text-muted-foreground line-clamp-2 italic">
                            "{record.message_content.substring(0, 100)}..."
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground">
                          {format(new Date(record.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteRecord(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}