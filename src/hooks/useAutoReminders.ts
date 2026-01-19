import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  plan: string;
  expires_at: string;
}

const planLabels: Record<string, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

function generateWhatsAppMessage(clientName: string, planName: string, daysRemaining: number): string {
  if (daysRemaining < 0) {
    return `Olá ${clientName}! 👋

Seu plano *${planName}* venceu há ${Math.abs(daysRemaining)} dia(s).

Para continuar utilizando nossos serviços, renove sua assinatura o quanto antes!

Caso tenha alguma dúvida, estamos à disposição. 😊`;
  }

  if (daysRemaining === 0) {
    return `Olá ${clientName}! 👋

Seu plano *${planName}* vence *hoje*!

Renove agora para não perder o acesso aos nossos serviços.

Qualquer dúvida, estamos aqui para ajudar! 😊`;
  }

  return `Olá ${clientName}! 👋

Seu plano *${planName}* vence em *${daysRemaining} dia(s)*.

Aproveite para renovar com antecedência e garantir a continuidade dos serviços!

Qualquer dúvida, estamos à disposição. 😊`;
}

interface ReminderSettings {
  whatsapp_reminders_enabled: boolean;
  reminder_days: number[];
  expired_reminder_days: number[];
}

interface SendResult {
  client: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}

export function useAutoReminders() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);

  const sendReminders = async (settings: ReminderSettings): Promise<{
    success: boolean;
    whatsappSent: number;
    whatsappFailed: number;
    results: SendResult[];
  }> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return { success: false, whatsappSent: 0, whatsappFailed: 0, results: [] };
    }

    if (!settings.whatsapp_reminders_enabled) {
      toast.info('Lembretes WhatsApp desativados');
      return { success: true, whatsappSent: 0, whatsappFailed: 0, results: [] };
    }

    setIsProcessing(true);
    setResults([]);

    let whatsappSent = 0;
    let whatsappFailed = 0;
    const allResults: SendResult[] = [];
    const processedClientIds = new Set<string>();

    const now = new Date();

    try {
      // Process clients expiring in configured days
      for (const days of settings.reminder_days) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + days);
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`Checking clients expiring in ${days} days`);

        const { data: clients, error } = await supabase
          .from('clients')
          .select('id, name, whatsapp, email, plan, expires_at')
          .eq('user_id', user.id)
          .gte('expires_at', startOfDay.toISOString())
          .lte('expires_at', endOfDay.toISOString());

        if (error) {
          console.error('Error fetching clients:', error);
          continue;
        }

        console.log(`Found ${clients?.length || 0} clients expiring in ${days} days`);

        for (const client of (clients || []) as Client[]) {
          if (processedClientIds.has(client.id)) continue;
          if (!client.whatsapp) {
            allResults.push({ client: client.name, status: 'skipped', error: 'Sem telefone' });
            continue;
          }

          // Check if already notified today
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const { data: existingNotification } = await supabase
            .from('notification_history')
            .select('id')
            .eq('client_id', client.id)
            .gte('created_at', today.toISOString())
            .limit(1);

          if (existingNotification && existingNotification.length > 0) {
            console.log(`Skipping ${client.name} - already notified today`);
            allResults.push({ client: client.name, status: 'skipped', error: 'Já notificado hoje' });
            continue;
          }

          processedClientIds.add(client.id);

          const planName = planLabels[client.plan] || client.plan;
          const message = generateWhatsAppMessage(client.name, planName, days);

          console.log(`Sending to ${client.name}...`);

          try {
            const { data, error: sendError } = await supabase.functions.invoke('send-whatsapp-text', {
              body: { phone: client.whatsapp, message }
            });

            if (sendError || !data?.success) {
              whatsappFailed++;
              allResults.push({ 
                client: client.name, 
                status: 'failed', 
                error: sendError?.message || data?.error || 'Erro desconhecido' 
              });
            } else {
              whatsappSent++;
              allResults.push({ client: client.name, status: 'sent' });

              // Log notification
              await supabase.from('notification_history').insert({
                client_id: client.id,
                user_id: user.id,
                notification_type: 'whatsapp',
                subject: `Lembrete: ${days} dias para vencer`,
                status: 'sent',
                days_until_expiration: days,
              });
            }
          } catch (err: unknown) {
            whatsappFailed++;
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            allResults.push({ client: client.name, status: 'failed', error: errorMessage });
          }

          // Delay between messages
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // Process expired clients
      for (const daysAgo of settings.expired_reminder_days) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - daysAgo);
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`Checking clients expired ${daysAgo} days ago`);

        const { data: clients, error } = await supabase
          .from('clients')
          .select('id, name, whatsapp, email, plan, expires_at')
          .eq('user_id', user.id)
          .gte('expires_at', startOfDay.toISOString())
          .lte('expires_at', endOfDay.toISOString());

        if (error) {
          console.error('Error fetching expired clients:', error);
          continue;
        }

        console.log(`Found ${clients?.length || 0} clients expired ${daysAgo} days ago`);

        for (const client of (clients || []) as Client[]) {
          if (processedClientIds.has(client.id)) continue;
          if (!client.whatsapp) {
            allResults.push({ client: client.name, status: 'skipped', error: 'Sem telefone' });
            continue;
          }

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const { data: existingNotification } = await supabase
            .from('notification_history')
            .select('id')
            .eq('client_id', client.id)
            .gte('created_at', today.toISOString())
            .limit(1);

          if (existingNotification && existingNotification.length > 0) {
            allResults.push({ client: client.name, status: 'skipped', error: 'Já notificado hoje' });
            continue;
          }

          processedClientIds.add(client.id);

          const planName = planLabels[client.plan] || client.plan;
          const message = generateWhatsAppMessage(client.name, planName, -daysAgo);

          console.log(`Sending expired reminder to ${client.name}...`);

          try {
            const { data, error: sendError } = await supabase.functions.invoke('send-whatsapp-text', {
              body: { phone: client.whatsapp, message }
            });

            if (sendError || !data?.success) {
              whatsappFailed++;
              allResults.push({ 
                client: client.name, 
                status: 'failed', 
                error: sendError?.message || data?.error || 'Erro desconhecido' 
              });
            } else {
              whatsappSent++;
              allResults.push({ client: client.name, status: 'sent' });

              await supabase.from('notification_history').insert({
                client_id: client.id,
                user_id: user.id,
                notification_type: 'whatsapp',
                subject: `Lembrete: expirou há ${daysAgo} dias`,
                status: 'sent',
                days_until_expiration: -daysAgo,
              });
            }
          } catch (err: unknown) {
            whatsappFailed++;
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            allResults.push({ client: client.name, status: 'failed', error: errorMessage });
          }

          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      setResults(allResults);
      return { success: true, whatsappSent, whatsappFailed, results: allResults };
    } catch (err: unknown) {
      console.error('Error in sendReminders:', err);
      return { success: false, whatsappSent, whatsappFailed, results: allResults };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    sendReminders,
    isProcessing,
    results,
  };
}
