import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getCurrentLevel } from '@/lib/referralLevels';

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

interface ReceivedReferral {
  id: string;
  referral_code: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export function useReferral() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [receivedReferral, setReceivedReferral] = useState<ReceivedReferral | null>(null);
  const [pendingDiscount, setPendingDiscount] = useState<number>(0);
  const [usedDiscounts, setUsedDiscounts] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [previousLevel, setPreviousLevel] = useState<string | null>(null);
  const [levelUpTriggered, setLevelUpTriggered] = useState<boolean>(false);

  const fetchReferralData = useCallback(async () => {
    if (!user) {
      setReferralCode(null);
      setReferrals([]);
      setReceivedReferral(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch user's referral code
    const { data: codeData, error: codeError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (codeError) {
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
        // If duplicate key error, code already exists - refetch it
        if (createError.code === '23505') {
          const { data: existingCode } = await supabase
            .from('referral_codes')
            .select('code')
            .eq('user_id', user.id)
            .single();
          if (existingCode) setReferralCode(existingCode.code);
        }
      } else if (newCode) {
        setReferralCode(newCode.code);
      }
    }

    // Fetch referrals made by this user (as referrer)
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

      // Check for level up
      const completedCount = (referralsData || []).filter(r => r.status === 'completed').length;
      const newLevel = getCurrentLevel(completedCount);
      
      if (previousLevel !== null && previousLevel !== newLevel.id) {
        setLevelUpTriggered(true);
      }
      setPreviousLevel(newLevel.id);
    }

    // Fetch referral received by this user (as referred)
    const { data: receivedData, error: receivedError } = await supabase
      .from('referrals')
      .select('id, referral_code, status, created_at, completed_at')
      .eq('referred_id', user.id)
      .maybeSingle();

    if (receivedError) {
      console.error('Error fetching received referral:', receivedError);
    } else {
      setReceivedReferral(receivedData);
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

    // Get referrer's completed referrals count to determine their level
    const { count: referrerCompletedCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', codeData.user_id)
      .eq('status', 'completed');

    // Calculate discount based on referrer's level
    const referrerLevel = getCurrentLevel(referrerCompletedCount || 0);
    const discountAmount = referrerLevel.discountPerReferral;

    // Create referral as pending - will be completed when referred user adds their first client
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: codeData.user_id,
        referred_id: user.id,
        referral_code: code.toUpperCase(),
        status: 'pending',
        completed_at: null,
        discount_amount: discountAmount,
      });

    if (insertError) {
      console.error('Error applying referral:', insertError);
      return { success: false, message: 'Erro ao aplicar código' };
    }

    await fetchReferralData();
    return { success: true, message: 'Código aplicado! A indicação será validada quando você assinar um plano.' };
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

  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const currentLevel = getCurrentLevel(completedReferrals);

  const clearLevelUp = () => setLevelUpTriggered(false);

  return {
    referralCode,
    referrals,
    receivedReferral,
    pendingDiscount,
    usedDiscounts,
    totalReferrals: referrals.length,
    completedReferrals,
    pendingReferrals: referrals.filter(r => r.status === 'pending').length,
    currentLevel,
    levelUpTriggered,
    clearLevelUp,
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