export interface ReferralLevel {
  id: string;
  name: string;
  minReferrals: number;
  discountPerReferral: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  benefits: string[];
}

export const REFERRAL_LEVELS: ReferralLevel[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    minReferrals: 0,
    discountPerReferral: 10,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: '🥉',
    benefits: ['R$ 10,00 por indicação'],
  },
  {
    id: 'silver',
    name: 'Prata',
    minReferrals: 5,
    discountPerReferral: 15,
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/10',
    borderColor: 'border-slate-400/30',
    icon: '🥈',
    benefits: ['R$ 15,00 por indicação', 'Badge exclusivo'],
  },
  {
    id: 'gold',
    name: 'Ouro',
    minReferrals: 15,
    discountPerReferral: 20,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: '🥇',
    benefits: ['R$ 20,00 por indicação', 'Badge exclusivo', 'Suporte prioritário'],
  },
  {
    id: 'platinum',
    name: 'Platina',
    minReferrals: 30,
    discountPerReferral: 25,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/30',
    icon: '💎',
    benefits: ['R$ 25,00 por indicação', 'Badge exclusivo', 'Suporte VIP', '1 mês grátis a cada 10 indicações'],
  },
  {
    id: 'diamond',
    name: 'Diamante',
    minReferrals: 50,
    discountPerReferral: 30,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30',
    icon: '👑',
    benefits: ['R$ 30,00 por indicação', 'Badge exclusivo', 'Suporte VIP', '1 mês grátis a cada 5 indicações', 'Acesso antecipado a novidades'],
  },
];

export function getCurrentLevel(completedReferrals: number): ReferralLevel {
  // Find the highest level the user qualifies for
  for (let i = REFERRAL_LEVELS.length - 1; i >= 0; i--) {
    if (completedReferrals >= REFERRAL_LEVELS[i].minReferrals) {
      return REFERRAL_LEVELS[i];
    }
  }
  return REFERRAL_LEVELS[0];
}

export function getNextLevel(completedReferrals: number): ReferralLevel | null {
  const currentLevel = getCurrentLevel(completedReferrals);
  const currentIndex = REFERRAL_LEVELS.findIndex(l => l.id === currentLevel.id);
  
  if (currentIndex < REFERRAL_LEVELS.length - 1) {
    return REFERRAL_LEVELS[currentIndex + 1];
  }
  return null;
}

export function getLevelProgress(completedReferrals: number): { 
  current: number; 
  target: number; 
  percentage: number;
  referralsToNext: number;
} {
  const currentLevel = getCurrentLevel(completedReferrals);
  const nextLevel = getNextLevel(completedReferrals);
  
  if (!nextLevel) {
    // Max level reached
    return { 
      current: completedReferrals, 
      target: completedReferrals, 
      percentage: 100,
      referralsToNext: 0 
    };
  }
  
  const currentMin = currentLevel.minReferrals;
  const nextMin = nextLevel.minReferrals;
  const progress = completedReferrals - currentMin;
  const range = nextMin - currentMin;
  
  return {
    current: progress,
    target: range,
    percentage: Math.min(100, Math.round((progress / range) * 100)),
    referralsToNext: nextMin - completedReferrals,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
