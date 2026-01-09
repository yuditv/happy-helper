export type PlanType = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export type ExpirationStatus = 'active' | 'expiring' | 'expired';

export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  plan: PlanType;
  createdAt: Date;
  expiresAt: Date;
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

export const getExpirationStatus = (expiresAt: Date): ExpirationStatus => {
  const now = new Date();
  const daysUntilExpiration = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiration < 0) return 'expired';
  if (daysUntilExpiration <= 7) return 'expiring';
  return 'active';
};

export const getDaysUntilExpiration = (expiresAt: Date): number => {
  const now = new Date();
  return Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};
