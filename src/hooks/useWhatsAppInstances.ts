import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppInstance {
  id: string;
  name: string;
  token: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'qr';
  phone?: string;
  profilePicture?: string;
  profileName?: string;
}

export function useWhatsAppInstances() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchInstances = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-list-instances');
      
      if (error) {
        console.error('Error fetching instances:', error);
        toast.error('Erro ao carregar instâncias');
        return;
      }

      if (data?.instances) {
        const formattedInstances: WhatsAppInstance[] = data.instances.map((inst: any) => ({
          id: inst.id || inst.name,
          name: inst.name,
          token: inst.token,
          status: inst.status === 'open' ? 'connected' : 
                  inst.status === 'qrcode' ? 'qr' : 
                  inst.status === 'connecting' ? 'connecting' : 'disconnected',
          phone: inst.phone || inst.wid?.replace('@s.whatsapp.net', ''),
          profilePicture: inst.profilePicture || inst.picture,
          profileName: inst.profileName || inst.pushname,
        }));
        setInstances(formattedInstances);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar instâncias');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createInstance = useCallback(async (name: string) => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-init-instance', {
        body: { name }
      });

      if (error) {
        console.error('Error creating instance:', error);
        toast.error('Erro ao criar instância');
        return null;
      }

      if (data?.success) {
        toast.success('Instância criada com sucesso!');
        await fetchInstances();
        return data.instance;
      }

      toast.error(data?.error || 'Erro ao criar instância');
      return null;
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao criar instância');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [fetchInstances]);

  const deleteInstance = useCallback(async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-delete-instance', {
        body: { token }
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

  const getQRCode = useCallback(async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-qrcode', {
        body: { token }
      });

      if (error) {
        console.error('Error getting QR code:', error);
        return null;
      }

      return data?.qrcode || null;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }, []);

  const getPairingCode = useCallback(async (token: string, phone: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-pairing-code', {
        body: { token, phone }
      });

      if (error) {
        console.error('Error getting pairing code:', error);
        toast.error('Erro ao gerar código de pareamento');
        return null;
      }

      if (data?.pairingCode) {
        return data.pairingCode;
      }

      toast.error(data?.error || 'Erro ao gerar código');
      return null;
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao gerar código de pareamento');
      return null;
    }
  }, []);

  const getStatus = useCallback(async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-status', {
        body: { token }
      });

      if (error) {
        console.error('Error getting status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }, []);

  const disconnectInstance = useCallback(async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-disconnect', {
        body: { token }
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

  return {
    instances,
    isLoading,
    isCreating,
    fetchInstances,
    createInstance,
    deleteInstance,
    getQRCode,
    getPairingCode,
    getStatus,
    disconnectInstance,
  };
}
