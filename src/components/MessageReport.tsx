import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { MessageCircle, Send, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

interface MessageStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  cancelled: number;
  email: number;
  whatsapp: number;
}

interface DailyData {
  date: string;
  sent: number;
  failed: number;
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6b7280'];

export function MessageReport() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [stats, setStats] = useState<MessageStats>({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    cancelled: 0,
    email: 0,
    whatsapp: 0,
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      result.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: ptBR }),
      });
    }
    return result;
  }, []);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, selectedMonth]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      // Fetch notification history for the selected month
      const { data: notifications, error } = await supabase
        .from('notification_history')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch scheduled messages for the selected month
      const { data: scheduled, error: schedError } = await supabase
        .from('scheduled_messages')
        .select('*')
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString());

      if (schedError) throw schedError;

      // Calculate stats
      const emailCount = notifications?.filter(n => n.notification_type === 'email').length || 0;
      const whatsappCount = notifications?.filter(n => n.notification_type === 'whatsapp').length || 0;
      
      const sentCount = scheduled?.filter(s => s.status === 'sent').length || 0;
      const failedCount = scheduled?.filter(s => s.status === 'failed').length || 0;
      const pendingCount = scheduled?.filter(s => s.status === 'pending').length || 0;
      const cancelledCount = scheduled?.filter(s => s.status === 'cancelled').length || 0;

      setStats({
        total: (notifications?.length || 0) + (scheduled?.length || 0),
        sent: sentCount + (notifications?.length || 0),
        failed: failedCount,
        pending: pendingCount,
        cancelled: cancelledCount,
        email: emailCount,
        whatsapp: whatsappCount,
      });

      // Calculate daily data
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const daily = days.map(day => {
        const daySent = notifications?.filter(n => 
          isSameDay(new Date(n.created_at), day)
        ).length || 0;
        
        const dayFailed = scheduled?.filter(s => 
          s.status === 'failed' && isSameDay(new Date(s.scheduled_at), day)
        ).length || 0;

        return {
          date: format(day, 'dd'),
          sent: daySent,
          failed: dayFailed,
        };
      });

      setDailyData(daily);
    } catch (error) {
      console.error('Error fetching message stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusData = [
    { name: 'Enviados', value: stats.sent, color: '#22c55e' },
    { name: 'Falharam', value: stats.failed, color: '#ef4444' },
    { name: 'Pendentes', value: stats.pending, color: '#f59e0b' },
    { name: 'Cancelados', value: stats.cancelled, color: '#6b7280' },
  ].filter(d => d.value > 0);

  const typeData = [
    { name: 'Email', value: stats.email, color: '#3b82f6' },
    { name: 'WhatsApp', value: stats.whatsapp, color: '#22c55e' },
  ].filter(d => d.value > 0);

  const successRate = stats.sent + stats.failed > 0 
    ? Math.round((stats.sent / (stats.sent + stats.failed)) * 100) 
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Relatório de Mensagens
        </h2>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m.value} value={m.value} className="capitalize">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.sent}</p>
                <p className="text-xs text-muted-foreground">Enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{successRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de sucesso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Envios por dia</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.some(d => d.sent > 0 || d.failed > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="sent" fill="#22c55e" name="Enviados" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" fill="#ef4444" name="Falharam" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Type distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Type breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Send className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.email}</p>
                  <p className="text-sm text-muted-foreground">Emails enviados</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.whatsapp}</p>
                  <p className="text-sm text-muted-foreground">WhatsApp enviados</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
