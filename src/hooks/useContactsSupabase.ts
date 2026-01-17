import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";

// Create a separate client for the external Supabase (contacts database)
const CONTACTS_SUPABASE_URL = import.meta.env.VITE_CONTACTS_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const CONTACTS_SUPABASE_KEY = import.meta.env.VITE_CONTACTS_SUPABASE_KEY || import.meta.env.SUPABASE_ANON_KEY;

// For edge function calls, we'll use the main supabase client
import { supabase as mainSupabase } from "@/integrations/supabase/client";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface DbContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapDbToContact(db: DbContact): Contact {
  return {
    id: db.id,
    name: db.name,
    phone: db.phone,
    email: db.email || undefined,
    notes: db.notes || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// Check if external Supabase is configured
const isExternalSupabaseConfigured = Boolean(CONTACTS_SUPABASE_URL && CONTACTS_SUPABASE_KEY);

// Create client only if configured
const contactsSupabase = isExternalSupabaseConfigured
  ? createClient(CONTACTS_SUPABASE_URL!, CONTACTS_SUPABASE_KEY!, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export function useContactsSupabase() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(isExternalSupabaseConfigured);

  // Get current user from main Supabase
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await mainSupabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();

    const { data: { subscription } } = mainSupabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch contacts from external Supabase
  const fetchContacts = useCallback(async () => {
    if (!contactsSupabase || !userId) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await contactsSupabase
        .from("contacts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setContacts((data as DbContact[] || []).map(mapDbToContact));
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Erro ao carregar contatos do banco de dados");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isConfigured) {
      fetchContacts();
    } else {
      setIsLoading(false);
    }
  }, [fetchContacts, isConfigured]);

  // Get total count (for display without loading all data)
  const getContactCount = useCallback(async (): Promise<number> => {
    if (!contactsSupabase || !userId) return 0;
    
    const { count, error } = await contactsSupabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    
    if (error) {
      console.error("Error counting contacts:", error);
      return contacts.length;
    }
    
    return count || 0;
  }, [userId, contacts.length]);

  const addContact = async (data: Omit<Contact, "id" | "createdAt" | "updatedAt">) => {
    if (!contactsSupabase) {
      toast.error("Supabase não está configurado");
      return null;
    }
    
    if (!userId) {
      toast.error("Você precisa estar logado para adicionar contatos");
      return null;
    }

    try {
      const { data: inserted, error } = await contactsSupabase
        .from("contacts")
        .insert({
          user_id: userId,
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newContact = mapDbToContact(inserted as DbContact);
      setContacts((prev) => [newContact, ...prev]);
      toast.success("Contato adicionado com sucesso!");
      return newContact;
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Erro ao adicionar contato");
      return null;
    }
  };

  const updateContact = async (id: string, data: Partial<Omit<Contact, "id" | "createdAt" | "updatedAt">>) => {
    if (!contactsSupabase || !userId) {
      toast.error("Você precisa estar logado");
      return;
    }

    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.email !== undefined) updateData.email = data.email || null;
      if (data.notes !== undefined) updateData.notes = data.notes || null;

      const { error } = await contactsSupabase
        .from("contacts")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;

      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === id
            ? { ...contact, ...data, updatedAt: new Date().toISOString() }
            : contact
        )
      );
      toast.success("Contato atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Erro ao atualizar contato");
    }
  };

  const deleteContact = async (id: string) => {
    if (!contactsSupabase || !userId) {
      toast.error("Você precisa estar logado");
      return;
    }

    try {
      const { error } = await contactsSupabase
        .from("contacts")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;

      setContacts((prev) => prev.filter((contact) => contact.id !== id));
      toast.success("Contato removido com sucesso!");
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Erro ao remover contato");
    }
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

  const importContacts = async (
    importedContacts: Array<Omit<Contact, "id" | "createdAt" | "updatedAt">>
  ) => {
    if (!contactsSupabase) {
      toast.error("Supabase não está configurado");
      return;
    }
    
    if (!userId) {
      toast.error("Você precisa estar logado para importar contatos");
      return;
    }

    try {
      const contactsToInsert = importedContacts.map((c) => ({
        user_id: userId,
        name: c.name,
        phone: c.phone,
        email: c.email || null,
        notes: c.notes || null,
      }));

      // Insert in batches of 500 to avoid payload limits
      const batchSize = 500;
      let totalInserted = 0;

      for (let i = 0; i < contactsToInsert.length; i += batchSize) {
        const batch = contactsToInsert.slice(i, i + batchSize);
        const { error } = await contactsSupabase.from("contacts").insert(batch);

        if (error) throw error;
        totalInserted += batch.length;
        
        // Show progress for large imports
        if (contactsToInsert.length > batchSize) {
          toast.info(`Importando... ${totalInserted}/${contactsToInsert.length}`);
        }
      }

      // Refresh the contacts list
      await fetchContacts();
      toast.success(`${totalInserted} contato(s) importado(s) com sucesso!`);
    } catch (error) {
      console.error("Error importing contacts:", error);
      toast.error("Erro ao importar contatos");
    }
  };

  const clearAllContacts = async () => {
    if (!contactsSupabase || !userId) {
      toast.error("Você precisa estar logado");
      return;
    }

    try {
      const { error } = await contactsSupabase
        .from("contacts")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      setContacts([]);
      toast.success("Todos os contatos foram removidos!");
    } catch (error) {
      console.error("Error clearing contacts:", error);
      toast.error("Erro ao limpar contatos");
    }
  };

  // Get all phone numbers for bulk dispatch
  const getAllPhoneNumbers = useCallback(async (): Promise<string[]> => {
    if (!contactsSupabase || !userId) return [];

    try {
      const { data, error } = await contactsSupabase
        .from("contacts")
        .select("phone")
        .eq("user_id", userId);

      if (error) throw error;
      return (data || []).map((c: { phone: string }) => c.phone);
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      return contacts.map((c) => c.phone);
    }
  }, [userId, contacts]);

  return {
    contacts,
    isLoading,
    userId,
    isConfigured,
    addContact,
    updateContact,
    deleteContact,
    searchContacts,
    importContacts,
    clearAllContacts,
    getContactCount,
    getAllPhoneNumbers,
    refetch: fetchContacts,
  };
}
