import { supabase } from '@/integrations/supabase/client';

interface SendWhatsAppResult {
  success: boolean;
  error?: string;
  data?: any;
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<SendWhatsAppResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
      body: { phone, message },
    });

    if (error) {
      console.error('Error calling send-whatsapp-evolution:', error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

export async function sendBulkWhatsAppMessages(
  messages: Array<{ phone: string; message: string }>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const { phone, message } of messages) {
    const result = await sendWhatsAppMessage(phone, message);
    
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(`${phone}: ${result.error}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}
