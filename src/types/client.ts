export type PlanType = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export type ExpirationStatus = 'active' | 'expiring' | 'expired';

export interface RenewalRecord {
  id: string;
  date: Date;
  previousExpiresAt: Date;
  newExpiresAt: Date;
  plan: PlanType;
}

export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  plan: PlanType;
  createdAt: Date;
  expiresAt: Date;
  renewalHistory: RenewalRecord[];
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

// Preços em reais
export const planPrices: Record<PlanType, number> = {
  monthly: 99.90,
  quarterly: 269.90,
  semiannual: 499.90,
  annual: 899.90,
};

// Preço mensal equivalente (para cálculo de MRR)
export const planMonthlyEquivalent: Record<PlanType, number> = {
  monthly: 99.90,
  quarterly: 269.90 / 3,
  semiannual: 499.90 / 6,
  annual: 899.90 / 12,
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
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
