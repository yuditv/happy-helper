import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ReferralCode {
  id: string;
  code: string;
  created_at: string;
}

interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: string;
  discount_amount: number;
  discount_used: boolean;
  created_at: string;
  completed_at: string | null;
}

export function useReferral() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [pendingDiscount, setPendingDiscount] = useState<number>(0);
  const [usedDiscounts, setUsedDiscounts] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReferralData = useCallback(async () => {
    if (!user) {
      setReferralCode(null);
      setReferrals([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch user's referral code
    const { data: codeData, error: codeError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (codeError && codeError.code !== 'PGRST116') {
      console.error('Error fetching referral code:', codeError);
    }

    if (codeData) {
      setReferralCode(codeData.code);
    } else {
      // Create referral code if it doesn't exist (for existing users)
      const { data: newCode, error: createError } = await supabase
        .from('referral_codes')
        .insert({ user_id: user.id, code: generateCode() })
        .select()
        .single();

      if (createError) {
        console.error('Error creating referral code:', createError);
      } else if (newCode) {
        setReferralCode(newCode.code);
      }
    }

    // Fetch referrals made by this user
    const { data: referralsData, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (referralsError) {
      console.error('Error fetching referrals:', referralsError);
    } else {
      setReferrals(referralsData || []);
      
      // Calculate pending discounts (completed but not used)
      const pending = (referralsData || [])
        .filter(r => r.status === 'completed' && !r.discount_used)
        .reduce((acc, r) => acc + Number(r.discount_amount), 0);
      setPendingDiscount(pending);

      // Calculate used discounts
      const used = (referralsData || [])
        .filter(r => r.discount_used)
        .reduce((acc, r) => acc + Number(r.discount_amount), 0);
      setUsedDiscounts(used);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  const applyReferralCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'Você precisa estar logado' };
    }

    // Check if code exists
    const { data: codeData, error: codeError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (codeError || !codeData) {
      return { success: false, message: 'Código de indicação inválido' };
    }

    // Can't use own code
    if (codeData.user_id === user.id) {
      return { success: false, message: 'Você não pode usar seu próprio código' };
    }

    // Check if user already used a referral
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_id', user.id)
      .single();

    if (existingReferral) {
      return { success: false, message: 'Você já usou um código de indicação' };
    }

    // Create referral
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: codeData.user_id,
        referred_id: user.id,
        referral_code: code.toUpperCase(),
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error applying referral:', insertError);
      return { success: false, message: 'Erro ao aplicar código' };
    }

    return { success: true, message: 'Código aplicado com sucesso! O usuário que indicou você ganhou um desconto.' };
  };

  const markDiscountAsUsed = async (referralId: string) => {
    const { error } = await supabase
      .from('referrals')
      .update({ discount_used: true })
      .eq('id', referralId);

    if (error) {
      console.error('Error marking discount as used:', error);
      return false;
    }

    await fetchReferralData();
    return true;
  };

  return {
    referralCode,
    referrals,
    pendingDiscount,
    usedDiscounts,
    totalReferrals: referrals.length,
    completedReferrals: referrals.filter(r => r.status === 'completed').length,
    isLoading,
    applyReferralCode,
    markDiscountAsUsed,
    refetch: fetchReferralData,
  };
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}