import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ScheduledDispatch {
  id: string;
  client_id: string;
  message_type: string;
  custom_message: string | null;
  scheduled_at: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  recurrence_type: string | null;
  recurrence_end_date: string | null;
  created_at: string;
  client?: {
    name: string;
    whatsapp: string;
  };
}

export function useScheduledDispatches() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduledDispatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select(`
          *,
          client:clients(name, whatsapp)
        `)
        .eq('user_id', user.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      console.error('Error fetching scheduled dispatches:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const createSchedule = async (
    clientIds: string[],
    message: string,
    scheduledAt: Date,
    recurrenceType?: string,
    recurrenceEndDate?: Date
  ) => {
    if (!user || clientIds.length === 0) return false;

    try {
      const inserts = clientIds.map(clientId => ({
        user_id: user.id,
        client_id: clientId,
        message_type: 'whatsapp',
        custom_message: message,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
        recurrence_type: recurrenceType || null,
        recurrence_end_date: recurrenceEndDate?.toISOString() || null,
      }));

      const { error } = await supabase
        .from('scheduled_messages')
        .insert(inserts);

      if (error) throw error;
      toast.success(`${clientIds.length} agendamento(s) criado(s) com sucesso!`);
      await fetchSchedules();
      return true;
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      toast.error('Erro ao criar agendamento');
      return false;
    }
  };

  const cancelSchedule = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Agendamento cancelado!');
      await fetchSchedules();
      return true;
    } catch (error: any) {
      console.error('Error cancelling schedule:', error);
      toast.error('Erro ao cancelar agendamento');
      return false;
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Agendamento excluído!');
      await fetchSchedules();
      return true;
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast.error('Erro ao excluir agendamento');
      return false;
    }
  };

  const pendingSchedules = schedules.filter(s => s.status === 'pending');
  const sentSchedules = schedules.filter(s => s.status === 'sent');
  const failedSchedules = schedules.filter(s => s.status === 'failed');

  return {
    schedules,
    pendingSchedules,
    sentSchedules,
    failedSchedules,
    isLoading,
    createSchedule,
    cancelSchedule,
    deleteSchedule,
    refetch: fetchSchedules,
  };
}
