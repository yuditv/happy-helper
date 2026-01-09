import { useState, useEffect, useMemo } from 'react';
import { Client, PlanType, getExpirationStatus, planDurations } from '@/types/client';
import { addMonths } from 'date-fns';

const STORAGE_KEY = 'clients';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setClients(parsed.map((c: Client) => ({ 
        ...c, 
        createdAt: new Date(c.createdAt),
        expiresAt: new Date(c.expiresAt)
      })));
    }
    setIsLoading(false);
  }, []);

  const saveClients = (newClients: Client[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newClients));
    setClients(newClients);
  };

  const addClient = (data: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    saveClients([...clients, newClient]);
    return newClient;
  };

  const updateClient = (id: string, data: Partial<Omit<Client, 'id' | 'createdAt'>>) => {
    const updated = clients.map(c => 
      c.id === id ? { ...c, ...data } : c
    );
    saveClients(updated);
  };

  const deleteClient = (id: string) => {
    saveClients(clients.filter(c => c.id !== id));
  };

  const renewClient = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    const now = new Date();
    const currentExpiration = client.expiresAt;
    // If already expired, renew from today. Otherwise, extend from current expiration.
    const baseDate = currentExpiration < now ? now : currentExpiration;
    const newExpiresAt = addMonths(baseDate, planDurations[client.plan]);

    updateClient(id, { expiresAt: newExpiresAt });
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
  };
}
