import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageCircle, 
  CheckCircle2, 
  XCircle, 
  Smartphone, 
  TrendingUp, 
  Activity,
  Zap,
  Signal
} from "lucide-react";
import { useWhatsAppMetrics } from "@/hooks/useWhatsAppMetrics";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { motion } from "framer-motion";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

const CHART_COLORS = {
  sent: "hsl(var(--chart-1))",
  failed: "hsl(var(--chart-2))",
  total: "hsl(var(--chart-3))",
  primary: "hsl(var(--primary))",
};

const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b"];

export function WhatsAppDashboard() {
  const { dailyMetrics, instanceMetrics, summary, isLoading: metricsLoading } = useWhatsAppMetrics();
  const { instances, isLoading: instancesLoading } = useWhatsAppInstances();

  const isLoading = metricsLoading || instancesLoading;

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM", { locale: ptBR });
  };

  const formatLastActivity = (dateStr: string | null) => {
    if (!dateStr) return "Sem atividade";
    const date = parseISO(dateStr);
    if (isToday(date)) return `Hoje às ${format(date, "HH:mm")}`;
    if (isYesterday(date)) return `Ontem às ${format(date, "HH:mm")}`;
    return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const pieData = [
    { name: "Enviadas", value: summary.sent_messages, color: "#10b981" },
    { name: "Falhas", value: summary.failed_messages, color: "#ef4444" },
  ].filter(d => d.value > 0);

  const instanceStatusData = [
    { name: "Online", value: instances.filter(i => i.status === "connected").length, color: "#10b981" },
    { name: "QR Code", value: instances.filter(i => i.status === "qrcode").length, color: "#f59e0b" },
    { name: "Offline", value: instances.filter(i => i.status === "disconnected" || !i.status).length, color: "#6b7280" },
  ].filter(d => d.value > 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-8 -mt-8" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Total de Mensagens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.total_messages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500/10 to-green-500/5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-8 -mt-8" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Enviadas com Sucesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{summary.sent_messages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.success_rate.toFixed(1)}% taxa de sucesso
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-500/10 to-red-500/5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-8 -mt-8" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Falhas no Envio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{summary.failed_messages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.total_messages > 0 
                  ? ((summary.failed_messages / summary.total_messages) * 100).toFixed(1)
                  : 0}% do total
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-8 -mt-8" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-500" />
                Instâncias Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">
                {summary.active_instances}/{summary.total_instances}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.total_instances > 0 
                  ? ((summary.active_instances / summary.total_instances) * 100).toFixed(0)
                  : 0}% conectadas
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Over Time */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Mensagens ao Longo do Tempo
              </CardTitle>
              <CardDescription>Volume de envios nos últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailyMetrics}>
                    <defs>
                      <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelFormatter={formatDate}
                    />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      stroke="#10b981"
                      fill="url(#sentGradient)"
                      strokeWidth={2}
                      name="Enviadas"
                    />
                    <Area
                      type="monotone"
                      dataKey="failed"
                      stroke="#ef4444"
                      fill="url(#failedGradient)"
                      strokeWidth={2}
                      name="Falhas"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhum dado disponível ainda</p>
                    <p className="text-sm">Envie mensagens para ver as métricas</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Distribution Charts */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Signal className="h-5 w-5 text-primary" />
                Status das Instâncias
              </CardTitle>
              <CardDescription>Distribuição de conexões</CardDescription>
            </CardHeader>
            <CardContent>
              {instanceStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={instanceStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {instanceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Smartphone className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhuma instância criada</p>
                    <p className="text-sm">Crie uma instância para começar</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Instance Performance */}
      {instanceMetrics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-0 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Performance por Instância
              </CardTitle>
              <CardDescription>Métricas individuais de cada conexão WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {instanceMetrics.map((inst, index) => {
                  const instanceData = instances.find(i => i.instance_name === inst.instance_name);
                  const status = instanceData?.status || 'disconnected';
                  
                  return (
                    <motion.div
                      key={inst.instance_name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-4 rounded-lg bg-muted/30 border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            status === 'connected' ? 'bg-green-500' :
                            status === 'qrcode' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`} />
                          <span className="font-medium">{inst.instance_name}</span>
                          <Badge variant={status === 'connected' ? 'default' : 'secondary'}>
                            {status === 'connected' ? 'Online' : 
                             status === 'qrcode' ? 'QR Code' : 'Offline'}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatLastActivity(inst.last_activity)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-semibold">{inst.total_messages}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Enviadas</p>
                          <p className="font-semibold text-green-500">{inst.sent_messages}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Falhas</p>
                          <p className="font-semibold text-red-500">{inst.failed_messages}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                          <p className="font-semibold">{inst.success_rate.toFixed(1)}%</p>
                        </div>
                      </div>
                      
                      <Progress 
                        value={inst.success_rate} 
                        className="h-2"
                      />
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty State */}
      {summary.total_messages === 0 && instances.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Card className="border-dashed border-2">
            <CardContent className="py-12">
              <div className="text-center">
                <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma métrica ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Crie instâncias WhatsApp e envie mensagens para ver as métricas aqui.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
