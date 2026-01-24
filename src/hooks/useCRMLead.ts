import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CRMLead {
  id: string;
  phone: string;
  name: string | null;
  fullName: string | null;
  email: string | null;
  personalId: string | null;
  status: string;
  notes: string | null;
  kanbanOrder: number;
  isTicketOpen: boolean;
  customFields: Record<string, string>;
  syncedAt: string | null;
}

export interface CRMLeadUpdate {
  name?: string;
  fullName?: string;
  email?: string;
  personalId?: string;
  status?: string;
  notes?: string;
  kanbanOrder?: number;
  isTicketOpen?: boolean;
  customFields?: Record<string, string>;
}

export const CRM_STATUSES = [
  { value: 'lead', label: 'Lead', color: 'bg-blue-500' },
  { value: 'qualified', label: 'Qualificado', color: 'bg-cyan-500' },
  { value: 'proposal', label: 'Proposta', color: 'bg-yellow-500' },
  { value: 'negotiation', label: 'Negociação', color: 'bg-orange-500' },
  { value: 'won', label: 'Fechado/Ganho', color: 'bg-green-500' },
  { value: 'lost', label: 'Perdido', color: 'bg-red-500' },
];

export function useCRMLead(phone: string | null, instanceId: string | null) {
  const [lead, setLead] = useState<CRMLead | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchLead = useCallback(async () => {
    if (!phone || !instanceId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-uazapi', {
        body: {
          action: 'get_lead',
          phone: phone.replace('@s.whatsapp.net', ''),
          instanceId,
        },
      });

      if (error) throw error;

      if (data?.data) {
        setLead({
          id: data.data.id,
          phone: data.data.phone,
          name: data.data.lead_name,
          fullName: data.data.lead_full_name,
          email: data.data.lead_email,
          personalId: data.data.lead_personal_id,
          status: data.data.lead_status || 'lead',
          notes: data.data.lead_notes,
          kanbanOrder: data.data.lead_kanban_order || 1000,
          isTicketOpen: data.data.is_ticket_open ?? true,
          customFields: data.data.custom_fields || {},
          syncedAt: data.data.synced_at,
        });
      } else {
        setLead(null);
      }
    } catch (error) {
      console.error('Error fetching CRM lead:', error);
    } finally {
      setIsLoading(false);
    }
  }, [phone, instanceId]);

  const updateLead = useCallback(async (updates: CRMLeadUpdate) => {
    if (!phone || !instanceId) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-uazapi', {
        body: {
          action: 'update_lead',
          phone: phone.replace('@s.whatsapp.net', ''),
          instanceId,
          data: updates,
        },
      });

      if (error) throw error;

      if (data?.data) {
        setLead({
          id: data.data.id,
          phone: data.data.phone,
          name: data.data.lead_name,
          fullName: data.data.lead_full_name,
          email: data.data.lead_email,
          personalId: data.data.lead_personal_id,
          status: data.data.lead_status || 'lead',
          notes: data.data.lead_notes,
          kanbanOrder: data.data.lead_kanban_order || 1000,
          isTicketOpen: data.data.is_ticket_open ?? true,
          customFields: data.data.custom_fields || {},
          syncedAt: data.data.synced_at,
        });
        toast.success('Dados do lead atualizados');
      }
    } catch (error) {
      console.error('Error updating CRM lead:', error);
      toast.error('Erro ao atualizar lead');
    } finally {
      setIsSaving(false);
    }
  }, [phone, instanceId]);

  const syncWithUazapi = useCallback(async () => {
    if (!phone || !instanceId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-uazapi', {
        body: {
          action: 'sync_lead',
          phone: phone.replace('@s.whatsapp.net', ''),
          instanceId,
        },
      });

      if (error) throw error;

      if (data?.data) {
        setLead({
          id: data.data.id,
          phone: data.data.phone,
          name: data.data.lead_name,
          fullName: data.data.lead_full_name,
          email: data.data.lead_email,
          personalId: data.data.lead_personal_id,
          status: data.data.lead_status || 'lead',
          notes: data.data.lead_notes,
          kanbanOrder: data.data.lead_kanban_order || 1000,
          isTicketOpen: data.data.is_ticket_open ?? true,
          customFields: data.data.custom_fields || {},
          syncedAt: data.data.synced_at,
        });
        toast.success('Dados sincronizados com UAZAPI');
      }
    } catch (error) {
      console.error('Error syncing CRM lead:', error);
      toast.error('Erro ao sincronizar com UAZAPI');
    } finally {
      setIsLoading(false);
    }
  }, [phone, instanceId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  return {
    lead,
    isLoading,
    isSaving,
    updateLead,
    syncWithUazapi,
    refetch: fetchLead,
  };
}