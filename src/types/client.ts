export type PlanType = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  plan: PlanType;
  createdAt: Date;
}

export const planLabels: Record<PlanType, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

export const planDurations: Record<PlanType, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};
