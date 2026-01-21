import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface WhatsAppInstance {
  id: string;
  name: string;
  instance_key: string;
  status: string;
  qr_code: string | null;
  phone_connected: string | null;
  daily_limit: number;
  messages_sent_today: number;
  business_hours_start: string;
  business_hours_end: string;
  is_active: boolean;
  created_at: string;
}

export function useWhatsAppInstances() {
  const { user } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInstances = useCallback(async () => {
    if (!user) return;
    try {
      // Use raw fetch since table may not be in types yet
      const { data, error } = await supabase
        .from('whatsapp_instances' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching instances:', error);
        setInstances([]);
        return;
      }
      setInstances((data as unknown as WhatsAppInstance[]) || []);
    } catch (error: any) {
      console.error('Error fetching instances:', error);
      setInstances([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const createInstance = async (name: string, dailyLimit?: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instances', {
        body: { action: 'create', name, daily_limit: dailyLimit },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Instância criada!');
      await fetchInstances();
      return data.instance;
    } catch (error: any) {
      console.error('Create instance error:', error);
      toast.error(error.message || 'Erro ao criar instância');
      return null;
    }
  };

  const getQRCode = async (instanceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instances', {
        body: { action: 'qrcode', instanceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await fetchInstances();
      return data.qrcode;
    } catch (error: any) {
      console.error('QR code error:', error);
      toast.error(error.message || 'Erro ao obter QR Code');
      return null;
    }
  };

  const checkStatus = async (instanceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instances', {
        body: { action: 'status', instanceId },
      });
      if (error) throw error;
      await fetchInstances();
      return data;
    } catch (error: any) {
      console.error('Status check error:', error);
      return null;
    }
  };

  const deleteInstance = async (instanceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instances', {
        body: { action: 'delete', instanceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Instância excluída!');
      await fetchInstances();
      return true;
    } catch (error: any) {
      console.error('Delete instance error:', error);
      toast.error(error.message || 'Erro ao excluir instância');
      return false;
    }
  };

  return {
    instances,
    isLoading,
    createInstance,
    getQRCode,
    checkStatus,
    deleteInstance,
    refetch: fetchInstances,
  };
}
