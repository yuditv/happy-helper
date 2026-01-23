import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Client, PlanType } from '@/types/client';

interface DbClient {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  service: string;
  plan: string;
  price: number | null;
  notes: string | null;
  created_at: string;
  expires_at: string;
  service_username: string | null;
  service_password: string | null;
  app_name: string | null;
  device: string | null;
}

interface DbRenewal {
  id: string;
  client_id: string;
  created_at: string;
  previous_expires_at: string;
  new_expires_at: string;
  plan: string;
}

export function useClientByPhone(phone: string | null) {
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchClient = useCallback(async () => {
    if (!user || !phone) {
      setClient(null);
      return;
    }

    setIsLoading(true);

    try {
      // Normalize phone number (remove non-digits)
      const normalizedPhone = phone.replace(/\D/g, '');
      
      // Try different phone formats
      const phoneVariants = [
        normalizedPhone,
        normalizedPhone.slice(-11), // Last 11 digits
        normalizedPhone.slice(-10), // Last 10 digits
        `55${normalizedPhone.slice(-11)}`, // With country code
      ];

      let foundClient: DbClient | null = null;

      for (const variant of phoneVariants) {
        if (foundClient) break;

        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .or(`whatsapp.ilike.%${variant}%,whatsapp.eq.${variant}`)
          .limit(1)
          .single();

        if (!error && data) {
          foundClient = data;
        }
      }

      if (!foundClient) {
        setClient(null);
        return;
      }

      // Fetch renewal history
      const { data: renewals } = await supabase
        .from('renewal_history')
        .select('*')
        .eq('client_id', foundClient.id)
        .order('renewed_at', { ascending: false });

      const mappedClient: Client = {
        id: foundClient.id,
        name: foundClient.name,
        whatsapp: foundClient.whatsapp,
        email: foundClient.email || '',
        service: (foundClient.service as 'IPTV' | 'VPN') || 'IPTV',
        plan: foundClient.plan as PlanType,
        price: foundClient.price,
        notes: foundClient.notes,
        createdAt: new Date(foundClient.created_at),
        expiresAt: new Date(foundClient.expires_at),
        renewalHistory: (renewals || []).map((r) => ({
          id: r.id,
          date: new Date(r.created_at),
          previousExpiresAt: new Date(r.previous_expires_at),
          newExpiresAt: new Date(r.new_expires_at),
          plan: r.plan as PlanType,
        })),
        serviceUsername: foundClient.service_username,
        servicePassword: foundClient.service_password,
        appName: foundClient.app_name,
        device: foundClient.device,
      };

      setClient(mappedClient);
    } catch (error) {
      console.error('Error fetching client by phone:', error);
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, phone]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  return { client, isLoading, refetch: fetchClient };
}
