import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CRM_STAGES } from './useCRMMetrics';

export interface KanbanLead {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: string;
  dealValue: number;
  kanbanOrder: number;
  instanceId: string | null;
  conversationId: string | null;
  notes: string | null;
  isTicketOpen: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useCRMKanban(instanceId?: string) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<KanbanLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchLeads = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('crm_lead_data')
        .select('*')
        .eq('user_id', user.id)
        .order('lead_kanban_order', { ascending: true });

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching CRM leads:', error);
        return;
      }

      const mappedLeads: KanbanLead[] = (data || []).map((lead: any) => ({
        id: lead.id,
        phone: lead.phone,
        name: lead.lead_name || lead.lead_full_name,
        email: lead.lead_email,
        status: lead.lead_status || 'lead',
        dealValue: Number(lead.deal_value) || 0,
        kanbanOrder: lead.lead_kanban_order || 1000,
        instanceId: lead.instance_id,
        conversationId: lead.conversation_id,
        notes: lead.lead_notes,
        isTicketOpen: lead.is_ticket_open,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
      }));

      setLeads(mappedLeads);
    } catch (err) {
      console.error('Exception fetching CRM leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, instanceId]);

  const moveCard = useCallback(async (
    leadId: string,
    newStatus: string,
    newOrder?: number
  ): Promise<boolean> => {
    if (!user) return false;

    setIsSaving(true);
    try {
      // Optimistic update
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, status: newStatus, kanbanOrder: newOrder ?? lead.kanbanOrder }
          : lead
      ));

      const updateData: any = { 
        lead_status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newOrder !== undefined) {
        updateData.lead_kanban_order = newOrder;
      }

      // Set closed_at when moving to won or lost
      if (newStatus === 'won' || newStatus === 'lost') {
        updateData.closed_at = new Date().toISOString();
        updateData.is_ticket_open = false;
      } else {
        updateData.closed_at = null;
        updateData.is_ticket_open = true;
      }

      const { error } = await supabase
        .from('crm_lead_data')
        .update(updateData)
        .eq('id', leadId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error moving card:', error);
        fetchLeads(); // Revert on error
        return false;
      }

      // Also sync with UAZAPI
      const lead = leads.find(l => l.id === leadId);
      if (lead?.phone && lead?.instanceId) {
        await supabase.functions.invoke('crm-uazapi', {
          body: {
            action: 'update_lead',
            phone: lead.phone,
            instanceId: lead.instanceId,
            data: { status: newStatus }
          }
        });
      }

      return true;
    } catch (err) {
      console.error('Exception moving card:', err);
      fetchLeads();
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, leads, fetchLeads]);

  const updateLead = useCallback(async (
    leadId: string,
    data: Partial<KanbanLead>
  ): Promise<boolean> => {
    if (!user) return false;

    setIsSaving(true);
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (data.name !== undefined) updateData.lead_name = data.name;
      if (data.email !== undefined) updateData.lead_email = data.email;
      if (data.dealValue !== undefined) updateData.deal_value = data.dealValue;
      if (data.notes !== undefined) updateData.lead_notes = data.notes;
      if (data.status !== undefined) updateData.lead_status = data.status;

      const { error } = await supabase
        .from('crm_lead_data')
        .update(updateData)
        .eq('id', leadId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating lead:', error);
        return false;
      }

      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, ...data } : lead
      ));

      return true;
    } catch (err) {
      console.error('Exception updating lead:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  const createLead = useCallback(async (data: {
    phone: string;
    name?: string;
    email?: string;
    status?: string;
    dealValue?: number;
    instanceId?: string;
  }): Promise<string | null> => {
    if (!user) return null;

    setIsSaving(true);
    try {
      const { data: newLead, error } = await supabase
        .from('crm_lead_data')
        .insert({
          user_id: user.id,
          phone: data.phone,
          lead_name: data.name,
          lead_email: data.email,
          lead_status: data.status || 'lead',
          deal_value: data.dealValue || 0,
          instance_id: data.instanceId,
          lead_kanban_order: 1000,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating lead:', error);
        return null;
      }

      await fetchLeads();
      return newLead.id;
    } catch (err) {
      console.error('Exception creating lead:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, fetchLeads]);

  const deleteLead = useCallback(async (leadId: string): Promise<boolean> => {
    if (!user) return false;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('crm_lead_data')
        .delete()
        .eq('id', leadId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting lead:', error);
        return false;
      }

      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      return true;
    } catch (err) {
      console.error('Exception deleting lead:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Group leads by status
  const columns = CRM_STAGES.map(stage => ({
    ...stage,
    leads: leads.filter(lead => lead.status === stage.value)
      .sort((a, b) => a.kanbanOrder - b.kanbanOrder),
  }));

  return {
    leads,
    columns,
    isLoading,
    isSaving,
    moveCard,
    updateLead,
    createLead,
    deleteLead,
    refetch: fetchLeads,
  };
}
