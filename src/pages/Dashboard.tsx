import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useClients } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  RefreshCw
} from "lucide-react";
import { ClientCharts } from "@/components/ClientCharts";
import { RetentionMetrics } from "@/components/RetentionMetrics";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MessageStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
}

interface MonthlyData {
  month: string;
  clients: number;
  renewals: number;
  messages: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clients, isLoading: clientsLoading } = useClients();
  const [messageStats, setMessageStats] = useState<MessageStats>({
    total: 0,
    pending: 0,
    sent: 0,
    failed: 0,
    cancelled: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch message statistics
      const { data: messages } = await supabase
        .from('scheduled_messages')
        .select('status')
        .eq('user_id', user.id);

      if (messages) {
        const stats = {
          total: messages.length,
          pending: messages.filter(m => m.status === 'pending').length,
          sent: messages.filter(m => m.status === 'sent').length,
          failed: messages.filter(m => m.status === 'failed').length,
          cancelled: messages.filter(m => m.status === 'cancelled').length
        };
        setMessageStats(stats);
      }

      // Fetch monthly data for the last 6 months
      const monthlyStats: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        const monthLabel = format(date, 'MMM', { locale: ptBR });

        // Count clients created in this month
        const clientsInMonth = clients.filter(c => {
          const createdAt = new Date(c.id); // Use created_at if available
          return createdAt >= start && createdAt <= end;
        }).length;

        // Fetch renewals for this month
        const { data: renewals } = await supabase
          .from('renewal_history')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        // Fetch messages sent in this month
        const { data: sentMessages } = await supabase
          .from('scheduled_messages')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'sent')
          .gte('sent_at', start.toISOString())
          .lte('sent_at', end.toISOString());

        monthlyStats.push({
          month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          clients: clientsInMonth || clients.length / 6, // Fallback for demo
          renewals: renewals?.length || 0,
          messages: sentMessages?.length || 0
        });
      }
      setMonthlyData(monthlyStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const planPrices: Record<string, number> = {
    monthly: 99.90,
    quarterly: 54.99,
    semiannual: 99.99,
    annual: 149.99
  };

  const planDurations: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    annual: 12
  };

  const totalClients = clients.length;
  const activeClients = clients.filter(c => new Date(c.expiresAt) > new Date()).length;
  const expiringClients = clients.filter(c => {
    const daysUntilExpiry = Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  }).length;
  const expiredClients = clients.filter(c => new Date(c.expiresAt) <= new Date()).length;

  const mrr = clients.reduce((acc, client) => {
    const price = client.price || planPrices[client.plan] || 0;
    const months = planDurations[client.plan] || 1;
    return acc + (price / months);
  }, 0);

  const retentionRate = totalClients > 0 ? ((activeClients / totalClients) * 100).toFixed(1) : 0;
  const churnRate = totalClients > 0 ? ((expiredClients / totalClients) * 100).toFixed(1) : 0;

  const messageChartData = [
    { name: 'Pendentes', value: messageStats.pending, color: 'hsl(var(--warning))' },
    { name: 'Enviadas', value: messageStats.sent, color: 'hsl(var(--primary))' },
    { name: 'Falhas', value: messageStats.failed, color: 'hsl(var(--destructive))' },
    { name: 'Canceladas', value: messageStats.cancelled, color: 'hsl(var(--muted-foreground))' }
  ].filter(d => d.value > 0);

  const planDistribution = [
    { name: 'Mensal', value: clients.filter(c => c.plan === 'monthly').length, color: '#3b82f6' },
    { name: 'Trimestral', value: clients.filter(c => c.plan === 'quarterly').length, color: '#8b5cf6' },
    { name: 'Semestral', value: clients.filter(c => c.plan === 'semiannual').length, color: '#06b6d4' },
    { name: 'Anual', value: clients.filter(c => c.plan === 'annual').length, color: '#10b981' }
  ].filter(d => d.value > 0);

  if (clientsLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Dashboard</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Users className="h-8 w-8 text-blue-500" />
                <span className="text-2xl font-bold">{totalClients}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Total Clientes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <span className="text-2xl font-bold">{activeClients}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Ativos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <span className="text-2xl font-bold">{expiringClients}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Expirando</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <XCircle className="h-8 w-8 text-red-500" />
                <span className="text-2xl font-bold">{expiredClients}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Expirados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <DollarSign className="h-8 w-8 text-emerald-500" />
                <span className="text-2xl font-bold">R$ {mrr.toFixed(0)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">MRR</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <MessageSquare className="h-8 w-8 text-purple-500" />
                <span className="text-2xl font-bold">{messageStats.total}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Mensagens</p>
            </CardContent>
          </Card>
        </div>

        {/* Retention & Churn */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Taxa de Retenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-green-500">{retentionRate}%</span>
                <span className="text-muted-foreground mb-1">dos clientes ativos</span>
              </div>
              <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${retentionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Taxa de Churn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-red-500">{churnRate}%</span>
                <span className="text-muted-foreground mb-1">clientes perdidos</span>
              </div>
              <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${churnRate}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Message Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status das Mensagens</CardTitle>
            </CardHeader>
            <CardContent>
              {messageChartData.length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={messageChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {messageChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Nenhuma mensagem agendada
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Plano</CardTitle>
            </CardHeader>
            <CardContent>
              {planDistribution.length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Nenhum cliente cadastrado
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Activity Chart */}
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Atividade Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="renewals" name="Renovações" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="messages" name="Mensagens" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Charts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientCharts clients={clients} />
          </CardContent>
        </Card>

        {/* Retention Metrics */}
        <RetentionMetrics clients={clients} />
      </main>
    </div>
  );
}
