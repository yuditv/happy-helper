import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useCRMAutomation() {
  const { user } = useAuth();

  const updateLeadStatus = useCallback(async (
    phone: string,
    instanceId: string,
    newStatus: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.functions.invoke('crm-uazapi', {
        body: {
          action: 'update_lead',
          phone,
          instanceId,
          data: { status: newStatus }
        }
      });

      if (error) {
        console.error('[CRM Automation] Error updating lead status:', error);
        return false;
      }

      console.log(`[CRM Automation] Lead ${phone} moved to status: ${newStatus}`);
      return true;
    } catch (err) {
      console.error('[CRM Automation] Exception:', err);
      return false;
    }
  }, [user]);

  const updateLeadValue = useCallback(async (
    phone: string,
    instanceId: string,
    dealValue: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('crm_lead_data')
        .update({ deal_value: dealValue })
        .eq('phone', phone)
        .eq('instance_id', instanceId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[CRM Automation] Error updating deal value:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[CRM Automation] Exception:', err);
      return false;
    }
  }, [user]);

  return {
    updateLeadStatus,
    updateLeadValue
  };
}
