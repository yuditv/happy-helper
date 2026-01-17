import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "personal_contacts";

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load contacts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setContacts(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
      toast.error("Erro ao carregar contatos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save contacts to localStorage
  const saveContacts = (newContacts: Contact[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newContacts));
      setContacts(newContacts);
    } catch (error) {
      console.error("Error saving contacts:", error);
      toast.error("Erro ao salvar contatos");
    }
  };

  const addContact = (data: Omit<Contact, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newContact: Contact = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    saveContacts([newContact, ...contacts]);
    toast.success("Contato adicionado com sucesso!");
    return newContact;
  };

  const updateContact = (id: string, data: Partial<Omit<Contact, "id" | "createdAt" | "updatedAt">>) => {
    const updated = contacts.map((contact) =>
      contact.id === id
        ? { ...contact, ...data, updatedAt: new Date().toISOString() }
        : contact
    );
    saveContacts(updated);
    toast.success("Contato atualizado com sucesso!");
  };

  const deleteContact = (id: string) => {
    const filtered = contacts.filter((contact) => contact.id !== id);
    saveContacts(filtered);
    toast.success("Contato removido com sucesso!");
  };

  const searchContacts = (query: string) => {
    if (!query.trim()) return contacts;
    const lower = query.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(lower) ||
        contact.phone.includes(query) ||
        contact.email?.toLowerCase().includes(lower)
    );
  };

  return {
    contacts,
    isLoading,
    addContact,
    updateContact,
    deleteContact,
    searchContacts,
  };
}
