import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface WhatsAppInstance {
  id: string;
  user_id: string;
  instance_id: string;
  instance_name: string;
  token: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'qr';
  phone?: string;
  profile_name?: string;
  profile_picture?: string;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppInstances() {
  const { user } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch instances from Supabase database
  const fetchInstances = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Using any to bypass type checking since table might not be in types.ts yet
      const { data, error } = await (supabase as any)
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching instances:', error);
        // Don't show error if table doesn't exist yet
        if (!error.message?.includes('does not exist')) {
          toast.error('Erro ao carregar instâncias');
        }
        return;
      }

      setInstances((data as WhatsAppInstance[]) || []);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Create new instance
  const createInstance = useCallback(async (name: string) => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return null;
    }

    console.log('=== createInstance START ===');
    console.log('Name:', name);
    console.log('User ID:', user.id);

    setIsCreating(true);
    try {
      console.log('Invoking uazapi-init-instance...');
      const { data, error } = await supabase.functions.invoke('uazapi-init-instance', {
        body: { name, user_id: user.id }
      });

      console.log('Response data:', JSON.stringify(data, null, 2));
      console.log('Response error:', JSON.stringify(error, null, 2));

      if (error) {
        console.error('Supabase function error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error context:', (error as any).context);
        toast.error(`Erro: ${error.message || 'Erro ao criar instância'}`);
        return null;
      }

      if (data?.success) {
        console.log('Instance created successfully:', data.instance);
        toast.success('Instância criada com sucesso!');
        await fetchInstances();
        return data.instance;
      }

      console.error('API returned error:', data);
      toast.error(data?.error || data?.message || 'Erro ao criar instância');
      return null;
    } catch (error: any) {
      console.error('=== CATCH ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      toast.error(`Erro: ${error?.message || 'Erro ao criar instância'}`);
      return null;
    } finally {
      setIsCreating(false);
      console.log('=== createInstance END ===');
    }
  }, [user?.id, fetchInstances]);

  // Delete instance
  const deleteInstance = useCallback(async (instance: WhatsAppInstance) => {
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-delete-instance', {
        body: { token: instance.token, instance_id: instance.id }
      });

      if (error) {
        console.error('Error deleting instance:', error);
        toast.error('Erro ao deletar instância');
        return false;
      }

      if (data?.success) {
        toast.success('Instância deletada com sucesso!');
        await fetchInstances();
        return true;
      }

      toast.error(data?.error || 'Erro ao deletar instância');
      return false;
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao deletar instância');
      return false;
    }
  }, [fetchInstances]);

  // Connect instance - get QR Code or Pairing Code
  const connect = useCallback(async (token: string, phone?: string): Promise<{ qrcode?: string; pairingCode?: string } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-connect', {
        body: { token, phone }
      });

      if (error) {
        console.error('Error connecting:', error);
        toast.error('Erro ao conectar instância');
        return null;
      }

      if (data?.success) {
        return {
          qrcode: data.qrcode,
          pairingCode: data.pairingCode
        };
      }

      toast.error(data?.error || 'Erro ao conectar');
      return null;
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao conectar instância');
      return null;
    }
  }, []);

  // Legacy method for backwards compatibility - get QR Code
  const getQRCode = useCallback(async (token: string): Promise<string | null> => {
    const result = await connect(token);
    return result?.qrcode || null;
  }, [connect]);

  // Legacy method for backwards compatibility - get pairing code
  const getPairingCode = useCallback(async (token: string, phone: string): Promise<string | null> => {
    const result = await connect(token, phone);
    return result?.pairingCode || null;
  }, [connect]);

  // Get status and update in database
  const getStatus = useCallback(async (instance: WhatsAppInstance) => {
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-status', {
        body: { token: instance.token, instance_id: instance.id }
      });

      if (error) {
        console.error('Error getting status:', error);
        return null;
      }

      // Refresh instances to get updated data
      await fetchInstances();

      return data;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }, [fetchInstances]);

  // Disconnect instance
  const disconnectInstance = useCallback(async (instance: WhatsAppInstance) => {
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-disconnect', {
        body: { token: instance.token, instance_id: instance.id }
      });

      if (error) {
        console.error('Error disconnecting:', error);
        toast.error('Erro ao desconectar instância');
        return false;
      }

      if (data?.success) {
        toast.success('Instância desconectada!');
        await fetchInstances();
        return true;
      }

      toast.error(data?.error || 'Erro ao desconectar');
      return false;
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao desconectar instância');
      return false;
    }
  }, [fetchInstances]);

  // Auto-fetch instances when user changes
  useEffect(() => {
    if (user?.id) {
      fetchInstances();
    }
  }, [user?.id, fetchInstances]);

  return {
    instances,
    isLoading,
    isCreating,
    fetchInstances,
    createInstance,
    deleteInstance,
    connect,
    getQRCode,
    getPairingCode,
    getStatus,
    disconnectInstance,
  };
}
