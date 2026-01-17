import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
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

const STORAGE_KEY = 'whatsapp_instances_v2';

export function useWhatsAppInstances() {
  const { user } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getStorageKey = useCallback(() => {
    return user ? `${STORAGE_KEY}_${user.id}` : STORAGE_KEY;
  }, [user]);

  useEffect(() => {
    if (user) {
      loadInstances();
    } else {
      setInstances([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadInstances = () => {
    try {
      setIsLoading(true);
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        const parsed = JSON.parse(saved) as WhatsAppInstance[];
        setInstances(parsed);
      }
    } catch (err) {
      console.error('Error loading instances:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToStorage = (newInstances: WhatsAppInstance[]) => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(newInstances));
    } catch (err) {
      console.error('Error saving instances:', err);
    }
  };

  const createInstance = async (instanceName: string): Promise<WhatsAppInstance | null> => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    // Check for duplicate
    if (instances.some(inst => inst.instance_name === instanceName)) {
      toast.error('Já existe uma instância com esse nome');
      return null;
    }

    const newInstance: WhatsAppInstance = {
      id: crypto.randomUUID(),
      user_id: user.id,
      instance_name: instanceName,
      status: 'disconnected',
      last_connected_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedInstances = [newInstance, ...instances];
    setInstances(updatedInstances);
    saveToStorage(updatedInstances);
    
    return newInstance;
  };

  const updateInstanceStatus = async (instanceName: string, status: string) => {
    if (!user) return;

    const updatedInstances = instances.map(inst => {
      if (inst.instance_name === instanceName) {
        return {
          ...inst,
          status,
          updated_at: new Date().toISOString(),
          last_connected_at: status === 'connected' ? new Date().toISOString() : inst.last_connected_at,
        };
      }
      return inst;
    });

    setInstances(updatedInstances);
    saveToStorage(updatedInstances);
  };

  const deleteInstance = async (instanceName: string): Promise<boolean> => {
    if (!user) return false;

    const updatedInstances = instances.filter(inst => inst.instance_name !== instanceName);
    setInstances(updatedInstances);
    saveToStorage(updatedInstances);
    toast.success('Instância removida');
    return true;
  };

  const setInstanceQRCode = (instanceName: string, base64: string | undefined) => {
    setInstances(prev => prev.map(inst =>
      inst.instance_name === instanceName
        ? { ...inst, base64 }
        : inst
    ));
  };

  const fetchInstances = () => {
    loadInstances();
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
