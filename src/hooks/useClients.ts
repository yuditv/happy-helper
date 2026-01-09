import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Client, PlanType, ServiceType, RenewalRecord, getExpirationStatus, planDurations } from '@/types/client';
import { addMonths } from 'date-fns';
import { useAuth } from './useAuth';

interface DbClient {
  id: string;
  user_id: string;
  name: string;
  whatsapp: string;
  email: string;
  service: string;
  plan: string;
  price: number | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface DbRenewal {
  id: string;
  client_id: string;
  user_id: string;
  plan: string;
  previous_expires_at: string;
  new_expires_at: string;
  created_at: string;
}

export function useClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!user) {
      setClients([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      setIsLoading(false);
      return;
    }

    const { data: renewalsData, error: renewalsError } = await supabase
      .from('renewal_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (renewalsError) {
      console.error('Error fetching renewals:', renewalsError);
    }

    const renewalsByClient = (renewalsData || []).reduce((acc, renewal: DbRenewal) => {
      if (!acc[renewal.client_id]) {
        acc[renewal.client_id] = [];
      }
      acc[renewal.client_id].push({
        id: renewal.id,
        date: new Date(renewal.created_at),
        previousExpiresAt: new Date(renewal.previous_expires_at),
        newExpiresAt: new Date(renewal.new_expires_at),
        plan: renewal.plan as PlanType,
      });
      return acc;
    }, {} as Record<string, RenewalRecord[]>);

    const formattedClients: Client[] = (clientsData || []).map((c: DbClient) => ({
      id: c.id,
      name: c.name,
      whatsapp: c.whatsapp,
      email: c.email,
      service: (c.service || 'IPTV') as ServiceType,
      plan: c.plan as PlanType,
      price: c.price,
      expiresAt: new Date(c.expires_at),
      createdAt: new Date(c.created_at),
      renewalHistory: renewalsByClient[c.id] || [],
    }));

    setClients(formattedClients);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const addClient = async (data: Omit<Client, 'id' | 'renewalHistory'>) => {
    if (!user) return null;

    // Check if this is user's first client (for referral validation)
    const isFirstClient = clients.length === 0;

    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name: data.name,
        whatsapp: data.whatsapp,
        email: data.email,
        service: data.service,
        plan: data.plan,
        price: data.price,
        created_at: data.createdAt.toISOString(),
        expires_at: data.expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding client:', error);
      return null;
    }

    // If first client, complete any pending referral for this user
    if (isFirstClient) {
      // First check if there's a pending referral with referrer info
      const { data: pendingReferral } = await supabase
        .from('referrals')
        .select('referrer_id, discount_amount')
        .eq('referred_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (pendingReferral) {
        // Complete the referral
        const { error: referralError } = await supabase
          .from('referrals')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('referred_id', user.id)
          .eq('status', 'pending');

        if (referralError) {
          console.error('Error completing referral:', referralError);
        } else {
          // Create notification for the referrer
          await supabase
            .from('notification_history')
            .insert({
              user_id: pendingReferral.referrer_id,
              client_id: newClient.id,
              notification_type: 'referral_completed',
              subject: 'Indicação validada! Você ganhou R$ 10,00 de desconto.',
              status: 'sent',
              days_until_expiration: null
            });

          // Get referrer profile to send email
          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', pendingReferral.referrer_id)
            .maybeSingle();

          // Send email notification to referrer
          try {
            await supabase.functions.invoke('send-referral-notification', {
              body: {
                referrerId: pendingReferral.referrer_id,
                referrerName: referrerProfile?.display_name || '',
                discountAmount: Number(pendingReferral.discount_amount) || 10
              }
            });
          } catch (emailError) {
            console.error('Error sending referral email:', emailError);
          }
        }
      }
    }

    await fetchClients();
    return newClient;
  };

  const updateClient = async (id: string, data: Partial<Omit<Client, 'id'>>) => {
    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.whatsapp) updateData.whatsapp = data.whatsapp;
    if (data.email) updateData.email = data.email;
    if (data.service) updateData.service = data.service;
    if (data.plan) updateData.plan = data.plan;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.createdAt) updateData.created_at = data.createdAt.toISOString();
    if (data.expiresAt) updateData.expires_at = data.expiresAt.toISOString();

    const { error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating client:', error);
      return;
    }

    await fetchClients();
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting client:', error);
      return;
    }

    await fetchClients();
  };

  const renewClient = async (id: string) => {
    if (!user) return null;
    
    const client = clients.find(c => c.id === id);
    if (!client) return null;

    const now = new Date();
    const currentExpiration = client.expiresAt;
    const baseDate = currentExpiration < now ? now : currentExpiration;
    const newExpiresAt = addMonths(baseDate, planDurations[client.plan]);

    // Insert renewal record
    const { error: renewalError } = await supabase
      .from('renewal_history')
      .insert({
        client_id: id,
        user_id: user.id,
        plan: client.plan,
        previous_expires_at: currentExpiration.toISOString(),
        new_expires_at: newExpiresAt.toISOString(),
      });

    if (renewalError) {
      console.error('Error creating renewal:', renewalError);
      return null;
    }

    // Update client expiration
    const { error: updateError } = await supabase
      .from('clients')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating client expiration:', updateError);
      return null;
    }

    await fetchClients();
    return newExpiresAt;
  };

  const getClientsByPlan = (plan: PlanType) => {
    return clients.filter(c => c.plan === plan);
  };

  const expiringClients = useMemo(() => {
    return clients.filter(c => getExpirationStatus(c.expiresAt) === 'expiring');
  }, [clients]);

  const expiredClients = useMemo(() => {
    return clients.filter(c => getExpirationStatus(c.expiresAt) === 'expired');
  }, [clients]);

  return {
    clients,
    isLoading,
    addClient,
    updateClient,
    deleteClient,
    renewClient,
    getClientsByPlan,
    expiringClients,
    expiredClients,
    refetch: fetchClients,
  };
}
