import { Client, PlanType, planLabels, planMonthlyEquivalent, planDurations, formatCurrency, getExpirationStatus } from '@/types/client';
import { Users, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { useMemo } from 'react';

interface ClientStatsProps {
  clients: Client[];
}

const planColors: Record<PlanType, string> = {
  monthly: 'bg-plan-monthly',
  quarterly: 'bg-plan-quarterly',
  semiannual: 'bg-plan-semiannual',
  annual: 'bg-plan-annual',
};

export function ClientStats({ clients }: ClientStatsProps) {
  const totalClients = clients.length;
  
  const planCounts = clients.reduce((acc, client) => {
    acc[client.plan] = (acc[client.plan] || 0) + 1;
    return acc;
  }, {} as Record<PlanType, number>);

  // Calculate total revenue per plan using custom prices
  const planRevenue = useMemo(() => {
    return clients
      .filter(c => getExpirationStatus(c.expiresAt) !== 'expired')
      .reduce((acc, client) => {
        const revenue = client.price !== null ? client.price : 0;
        acc[client.plan] = (acc[client.plan] || 0) + revenue;
        return acc;
      }, {} as Record<PlanType, number>);
  }, [clients]);

  // Calculate MRR (Monthly Recurring Revenue) - use custom price if available
  const mrr = useMemo(() => {
    return clients
      .filter(c => getExpirationStatus(c.expiresAt) !== 'expired')
      .reduce((acc, client) => {
        // Use custom price divided by plan duration, or fallback to planMonthlyEquivalent
        const monthlyValue = client.price !== null 
          ? client.price / planDurations[client.plan]
          : planMonthlyEquivalent[client.plan];
        return acc + monthlyValue;
      }, 0);
  }, [clients]);

  // Active vs expiring/expired
  const activeClients = clients.filter(c => getExpirationStatus(c.expiresAt) === 'active').length;
  const atRiskClients = clients.filter(c => ['expiring', 'expired'].includes(getExpirationStatus(c.expiresAt))).length;

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalClients}</p>
              <p className="text-xs text-muted-foreground">Total de Clientes</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-plan-semiannual/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-plan-semiannual" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(mrr)}</p>
              <p className="text-xs text-muted-foreground">MRR (Receita Mensal)</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-plan-quarterly/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-plan-quarterly" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeClients}</p>
              <p className="text-xs text-muted-foreground">Clientes Ativos</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{atRiskClients}</p>
              <p className="text-xs text-muted-foreground">Em Risco</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(planLabels) as PlanType[]).map((plan) => (
          <div
            key={plan}
            className="bg-card rounded-xl p-4 shadow-sm border border-border/50"
          >
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${planColors[plan]}`} />
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-xl font-bold text-foreground">
                    {planCounts[plan] || 0}
                  </p>
                  <p className="text-xs font-medium text-primary">
                    {formatCurrency(planRevenue[plan] || 0)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{planLabels[plan]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
