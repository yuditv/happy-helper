import { useState, useEffect } from 'react';
import { Client, PlanType } from '@/types/client';

const STORAGE_KEY = 'clients';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setClients(parsed.map((c: Client) => ({ ...c, createdAt: new Date(c.createdAt) })));
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

  const getClientsByPlan = (plan: PlanType) => {
    return clients.filter(c => c.plan === plan);
  };

  return {
    clients,
    isLoading,
    addClient,
    updateClient,
    deleteClient,
    getClientsByPlan,
  };
}
