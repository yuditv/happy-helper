import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppInstance {
  id: string;
  user_id: string;
  instance_name: string;
  status: string;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
  // Client-side only
  base64?: string;
}

// Type for database operations (since table isn't in generated types yet)
type WhatsAppInstanceDB = {
  id: string;
  user_id: string;
  instance_name: string;
  status: string;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
};

export function useWhatsAppInstances() {
  const { user } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInstances = useCallback(async () => {
    if (!user) {
      setInstances([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Use direct query with any cast since table may not be in generated types yet
      const { data, error } = await (supabase as any)
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching instances:', error);
        // If table doesn't exist yet, just return empty
        if (error.code === '42P01') {
          console.log('Table does not exist yet');
          setInstances([]);
          return;
        }
        toast.error('Erro ao carregar instâncias');
        return;
      }

      setInstances((data as WhatsAppInstanceDB[]) || []);
    } catch (err) {
      console.error('Error fetching instances:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const createInstance = async (instanceName: string): Promise<WhatsAppInstance | null> => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    // Check for duplicate locally first
    if (instances.some(inst => inst.instance_name === instanceName)) {
      toast.error('Já existe uma instância com esse nome');
      return null;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('whatsapp_instances')
        .insert({
          user_id: user.id,
          instance_name: instanceName,
          status: 'disconnected',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating instance:', error);
        if (error.code === '23505') {
          toast.error('Já existe uma instância com esse nome');
        } else if (error.code === '42P01') {
          toast.error('Tabela não configurada. Execute a migration.');
        } else {
          toast.error('Erro ao criar instância');
        }
        return null;
      }

      const newInstance = data as WhatsAppInstance;
      setInstances(prev => [newInstance, ...prev]);
      return newInstance;
    } catch (err) {
      console.error('Error creating instance:', err);
      toast.error('Erro ao criar instância');
      return null;
    }
  };

  const updateInstanceStatus = async (instanceName: string, status: string) => {
    if (!user) return;

    try {
      const updateData: { status: string; last_connected_at?: string } = { status };
      
      if (status === 'connected') {
        updateData.last_connected_at = new Date().toISOString();
      }

      const { error } = await (supabase as any)
        .from('whatsapp_instances')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('instance_name', instanceName);

      if (error) {
        console.error('Error updating instance:', error);
        return;
      }

      // Update local state
      setInstances(prev => prev.map(inst => {
        if (inst.instance_name === instanceName) {
          return {
            ...inst,
            status,
            updated_at: new Date().toISOString(),
            last_connected_at: status === 'connected' ? new Date().toISOString() : inst.last_connected_at,
          };
        }
        return inst;
      }));
    } catch (err) {
      console.error('Error updating instance:', err);
    }
  };

  const deleteInstance = async (instanceName: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await (supabase as any)
        .from('whatsapp_instances')
        .delete()
        .eq('user_id', user.id)
        .eq('instance_name', instanceName);

      if (error) {
        console.error('Error deleting instance:', error);
        toast.error('Erro ao remover instância');
        return false;
      }

      setInstances(prev => prev.filter(inst => inst.instance_name !== instanceName));
      toast.success('Instância removida');
      return true;
    } catch (err) {
      console.error('Error deleting instance:', err);
      toast.error('Erro ao remover instância');
      return false;
    }
  };

  const setInstanceQRCode = (instanceName: string, base64: string | undefined) => {
    setInstances(prev => prev.map(inst =>
      inst.instance_name === instanceName
        ? { ...inst, base64 }
        : inst
    ));
  };

  return {
    instances,
    isLoading,
    fetchInstances,
    createInstance,
    updateInstanceStatus,
    deleteInstance,
    setInstanceQRCode
  };
}
