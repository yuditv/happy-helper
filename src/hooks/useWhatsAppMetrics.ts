import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface MessageMetric {
  id: string;
  user_id: string;
  instance_name: string;
  message_type: 'text' | 'media' | 'bulk';
  status: 'sent' | 'failed' | 'pending';
  recipient_phone: string;
  created_at: string;
}

export interface ConnectionLog {
  id: string;
  user_id: string;
  instance_name: string;
  status: string;
  timestamp: string;
}

export interface DailyMetric {
  date: string;
  sent: number;
  failed: number;
  total: number;
}

export interface InstanceMetrics {
  instance_name: string;
  total_messages: number;
  sent_messages: number;
  failed_messages: number;
  success_rate: number;
  last_activity: string | null;
}

export interface MetricsSummary {
  total_messages: number;
  sent_messages: number;
  failed_messages: number;
  success_rate: number;
  active_instances: number;
  total_instances: number;
}

export function useWhatsAppMetrics() {
  const { user } = useAuth();
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [instanceMetrics, setInstanceMetrics] = useState<InstanceMetrics[]>([]);
  const [summary, setSummary] = useState<MetricsSummary>({
    total_messages: 0,
    sent_messages: 0,
    failed_messages: 0,
    success_rate: 0,
    active_instances: 0,
    total_instances: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch message logs from whatsapp_message_logs table
      const { data: messageLogs, error: logsError } = await (supabase as any)
        .from('whatsapp_message_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch instances
      const { data: instances, error: instancesError } = await (supabase as any)
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', user.id);

      if (logsError && logsError.code !== '42P01') {
        console.error('Error fetching message logs:', logsError);
      }

      if (instancesError && instancesError.code !== '42P01') {
        console.error('Error fetching instances:', instancesError);
      }

      const logs = (messageLogs || []) as MessageMetric[];
      const instList = (instances || []) as { instance_name: string; status: string }[];

      // Calculate daily metrics (last 30 days)
      const dailyMap = new Map<string, { sent: number; failed: number }>();
      const today = new Date();
      
      // Initialize last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap.set(dateStr, { sent: 0, failed: 0 });
      }

      // Fill with actual data
      logs.forEach(log => {
        const dateStr = log.created_at.split('T')[0];
        if (dailyMap.has(dateStr)) {
          const current = dailyMap.get(dateStr)!;
          if (log.status === 'sent') {
            current.sent++;
          } else if (log.status === 'failed') {
            current.failed++;
          }
        }
      });

      const daily: DailyMetric[] = Array.from(dailyMap.entries()).map(([date, counts]) => ({
        date,
        sent: counts.sent,
        failed: counts.failed,
        total: counts.sent + counts.failed,
      }));

      setDailyMetrics(daily);

      // Calculate instance metrics
      const instanceMap = new Map<string, InstanceMetrics>();
      
      instList.forEach(inst => {
        instanceMap.set(inst.instance_name, {
          instance_name: inst.instance_name,
          total_messages: 0,
          sent_messages: 0,
          failed_messages: 0,
          success_rate: 0,
          last_activity: null,
        });
      });

      logs.forEach(log => {
        if (!instanceMap.has(log.instance_name)) {
          instanceMap.set(log.instance_name, {
            instance_name: log.instance_name,
            total_messages: 0,
            sent_messages: 0,
            failed_messages: 0,
            success_rate: 0,
            last_activity: null,
          });
        }
        
        const metrics = instanceMap.get(log.instance_name)!;
        metrics.total_messages++;
        
        if (log.status === 'sent') {
          metrics.sent_messages++;
        } else if (log.status === 'failed') {
          metrics.failed_messages++;
        }
        
        if (!metrics.last_activity || log.created_at > metrics.last_activity) {
          metrics.last_activity = log.created_at;
        }
      });

      // Calculate success rates
      instanceMap.forEach(metrics => {
        if (metrics.total_messages > 0) {
          metrics.success_rate = (metrics.sent_messages / metrics.total_messages) * 100;
        }
      });

      setInstanceMetrics(Array.from(instanceMap.values()));

      // Calculate summary
      const totalMessages = logs.length;
      const sentMessages = logs.filter(l => l.status === 'sent').length;
      const failedMessages = logs.filter(l => l.status === 'failed').length;
      const activeInstances = instList.filter(i => i.status === 'connected').length;

      setSummary({
        total_messages: totalMessages,
        sent_messages: sentMessages,
        failed_messages: failedMessages,
        success_rate: totalMessages > 0 ? (sentMessages / totalMessages) * 100 : 0,
        active_instances: activeInstances,
        total_instances: instList.length,
      });

    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Log a message (call this when sending messages)
  const logMessage = async (
    instanceName: string,
    recipientPhone: string,
    messageType: 'text' | 'media' | 'bulk',
    status: 'sent' | 'failed' | 'pending'
  ) => {
    if (!user) return;

    try {
      await (supabase as any)
        .from('whatsapp_message_logs')
        .insert({
          user_id: user.id,
          instance_name: instanceName,
          recipient_phone: recipientPhone,
          message_type: messageType,
          status,
        });

      // Refresh metrics
      fetchMetrics();
    } catch (err) {
      console.error('Error logging message:', err);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    dailyMetrics,
    instanceMetrics,
    summary,
    isLoading,
    fetchMetrics,
    logMessage,
  };
}
