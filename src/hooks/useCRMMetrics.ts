import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CRMMetrics {
  totalLeads: number;
  leadsByStatus: { status: string; count: number; value: number; label: string; color: string }[];
  conversionRates: { from: string; to: string; rate: number; fromLabel: string; toLabel: string }[];
  totalPipelineValue: number;
  avgDealValue: number;
  wonDealsCount: number;
  lostDealsCount: number;
  winRate: number;
  openDealsCount: number;
  thisMonthWon: number;
  thisMonthLost: number;
}

export const CRM_STAGES = [
  { value: 'lead', label: 'Lead', color: '#6b7280', order: 1 },
  { value: 'qualified', label: 'Qualificado', color: '#3b82f6', order: 2 },
  { value: 'proposal', label: 'Proposta', color: '#8b5cf6', order: 3 },
  { value: 'negotiation', label: 'Negociação', color: '#f59e0b', order: 4 },
  { value: 'won', label: 'Ganho', color: '#22c55e', order: 5 },
  { value: 'lost', label: 'Perdido', color: '#ef4444', order: 6 },
];

export function useCRMMetrics(instanceId?: string) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CRMMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('crm_lead_data')
        .select('*')
        .eq('user_id', user.id);

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }

      const { data: leads, error } = await query;

      if (error) {
        console.error('Error fetching CRM metrics:', error);
        return;
      }

      const leadsData = leads || [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate metrics
      const totalLeads = leadsData.length;
      
      // Group by status
      const statusCounts: Record<string, { count: number; value: number }> = {};
      CRM_STAGES.forEach(stage => {
        statusCounts[stage.value] = { count: 0, value: 0 };
      });

      leadsData.forEach((lead: any) => {
        const status = lead.lead_status || 'lead';
        if (!statusCounts[status]) {
          statusCounts[status] = { count: 0, value: 0 };
        }
        statusCounts[status].count++;
        statusCounts[status].value += Number(lead.deal_value) || 0;
      });

      const leadsByStatus = CRM_STAGES.map(stage => ({
        status: stage.value,
        label: stage.label,
        color: stage.color,
        count: statusCounts[stage.value]?.count || 0,
        value: statusCounts[stage.value]?.value || 0,
      }));

      // Calculate conversion rates between stages
      const orderedStages = CRM_STAGES.filter(s => s.value !== 'lost').slice(0, 5);
      const conversionRates: CRMMetrics['conversionRates'] = [];

      for (let i = 0; i < orderedStages.length - 1; i++) {
        const fromStage = orderedStages[i];
        const toStage = orderedStages[i + 1];
        const fromCount = statusCounts[fromStage.value]?.count || 0;
        const toCount = statusCounts[toStage.value]?.count || 0;
        
        // Sum of leads that passed through or are in later stages
        let passedCount = 0;
        for (let j = i + 1; j < orderedStages.length; j++) {
          passedCount += statusCounts[orderedStages[j].value]?.count || 0;
        }
        
        const totalFromStage = fromCount + passedCount;
        const rate = totalFromStage > 0 ? (passedCount / totalFromStage) * 100 : 0;

        conversionRates.push({
          from: fromStage.value,
          to: toStage.value,
          fromLabel: fromStage.label,
          toLabel: toStage.label,
          rate: Math.round(rate),
        });
      }

      // Pipeline value (excluding won and lost)
      const openStages = ['lead', 'qualified', 'proposal', 'negotiation'];
      const totalPipelineValue = leadsData
        .filter((lead: any) => openStages.includes(lead.lead_status || 'lead'))
        .reduce((sum: number, lead: any) => sum + (Number(lead.deal_value) || 0), 0);

      // Won deals
      const wonDeals = leadsData.filter((lead: any) => lead.lead_status === 'won');
      const wonDealsCount = wonDeals.length;

      // Lost deals
      const lostDeals = leadsData.filter((lead: any) => lead.lead_status === 'lost');
      const lostDealsCount = lostDeals.length;

      // Win rate
      const closedDeals = wonDealsCount + lostDealsCount;
      const winRate = closedDeals > 0 ? Math.round((wonDealsCount / closedDeals) * 100) : 0;

      // Average deal value (from won deals)
      const avgDealValue = wonDealsCount > 0 
        ? wonDeals.reduce((sum: number, lead: any) => sum + (Number(lead.deal_value) || 0), 0) / wonDealsCount 
        : 0;

      // Open deals count
      const openDealsCount = leadsData.filter((lead: any) => 
        openStages.includes(lead.lead_status || 'lead')
      ).length;

      // This month's won/lost
      const thisMonthWon = leadsData.filter((lead: any) => 
        lead.lead_status === 'won' && 
        lead.closed_at && 
        new Date(lead.closed_at) >= startOfMonth
      ).length;

      const thisMonthLost = leadsData.filter((lead: any) => 
        lead.lead_status === 'lost' && 
        lead.closed_at && 
        new Date(lead.closed_at) >= startOfMonth
      ).length;

      setMetrics({
        totalLeads,
        leadsByStatus,
        conversionRates,
        totalPipelineValue,
        avgDealValue,
        wonDealsCount,
        lostDealsCount,
        winRate,
        openDealsCount,
        thisMonthWon,
        thisMonthLost,
      });
    } catch (err) {
      console.error('Exception fetching CRM metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, instanceId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    refetch: fetchMetrics,
  };
}
