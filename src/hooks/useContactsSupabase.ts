import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Note: The contacts table needs to be created in Supabase
// This uses type assertions since the table may not be in the generated types yet

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

export function useContactsSupabase() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isConfigured] = useState(true);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!userId) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Use type assertion since contacts table may not be in generated types
      const { data, error } = await (supabase as any)
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
    fetchContacts();
  }, [fetchContacts]);

  // Get total count
  const getContactCount = useCallback(async (): Promise<number> => {
    if (!userId) return 0;
    
    const { count, error } = await (supabase as any)
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
    if (!userId) {
      toast.error("Você precisa estar logado para adicionar contatos");
      return null;
    }

    try {
      const { data: newData, error } = await (supabase as any)
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

      const newContact = mapDbToContact(newData as unknown as DbContact);
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
    if (!userId) {
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

      const { error } = await (supabase as any)
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
    if (!userId) {
      toast.error("Você precisa estar logado");
      return;
    }

    try {
      const { error } = await (supabase as any)
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

      // Insert in batches of 500
      const batchSize = 500;
      let totalInserted = 0;

      for (let i = 0; i < contactsToInsert.length; i += batchSize) {
        const batch = contactsToInsert.slice(i, i + batchSize);
        const { error } = await (supabase as any).from("contacts").insert(batch);

        if (error) throw error;
        totalInserted += batch.length;
        
        if (contactsToInsert.length > batchSize) {
          toast.info(`Importando... ${totalInserted}/${contactsToInsert.length}`);
        }
      }

      await fetchContacts();
      toast.success(`${totalInserted} contato(s) importado(s) com sucesso!`);
    } catch (error) {
      console.error("Error importing contacts:", error);
      toast.error("Erro ao importar contatos");
    }
  };

  const clearAllContacts = async () => {
    if (!userId) {
      toast.error("Você precisa estar logado");
      return;
    }

    try {
      const { error } = await (supabase as any)
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

  const getAllPhoneNumbers = useCallback(async (): Promise<string[]> => {
    if (!userId) return [];

    try {
      const { data, error } = await (supabase as any)
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
