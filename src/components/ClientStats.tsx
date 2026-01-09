import { Client, PlanType, planLabels } from '@/types/client';
import { Users } from 'lucide-react';

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

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="col-span-2 md:col-span-1 bg-card rounded-xl p-4 shadow-sm border border-border/50">
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

      {(Object.keys(planLabels) as PlanType[]).map((plan) => (
        <div
          key={plan}
          className="bg-card rounded-xl p-4 shadow-sm border border-border/50"
        >
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${planColors[plan]}`} />
            <div>
              <p className="text-xl font-bold text-foreground">
                {planCounts[plan] || 0}
              </p>
              <p className="text-xs text-muted-foreground">{planLabels[plan]}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
