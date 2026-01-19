// Auto Send Reminders - Uazapi Integration
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const planLabels: Record<string, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

interface NotificationSettings {
  user_id?: string;
  email_reminders_enabled: boolean;
  whatsapp_reminders_enabled: boolean;
  auto_send_enabled: boolean;
  reminder_days: number[];
  expired_reminder_days?: number[];
}

interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  expires_at: string;
  price: number;
}

function formatPhoneForWhatsApp(phone: string): string {
  const numbersOnly = phone.replace(/\D/g, '');
  if (numbersOnly.length <= 11) {
    return `55${numbersOnly}`;
  }
  return numbersOnly;
}

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

async function sendWhatsAppUazapi(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const uazapiToken = Deno.env.get("UAZAPI_TOKEN");
  const uazapiUrl = Deno.env.get("UAZAPI_URL");

  if (!uazapiToken || !uazapiUrl) {
    console.log("Uazapi not configured");
    return { success: false, error: "Uazapi não configurado" };
  }

  const formattedPhone = formatPhoneForWhatsApp(phone);
  const baseUrl = uazapiUrl.replace(/\/$/, '');
  const apiUrl = `${baseUrl}/message/text`;

  console.log(`Sending WhatsApp to ${formattedPhone} via ${apiUrl}`);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${uazapiToken}`,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
      }),
    });

    const responseText = await response.text();
    console.log("Uazapi response:", responseText);

    if (!response.ok) {
      return { success: false, error: responseText };
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Error sending WhatsApp:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

serve(async (req: Request): Promise<Response> => {
  console.log("auto-send-reminders function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let settings: NotificationSettings | null = null;
    let testMode = false;

    try {
      const body = await req.json();
      settings = body.settings || null;
      testMode = body.test_mode || false;
    } catch {
      // Empty body is OK
    }

    // Get user ID from auth header
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
        console.log("Authenticated user:", userId);
      } catch (err) {
        console.log("Auth error (ignored):", err);
      }
    }

    if (!settings && !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configurações não fornecidas. Faça login ou passe as configurações no body." 
        }), 
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userSettings: NotificationSettings = settings || {
      email_reminders_enabled: false,
      whatsapp_reminders_enabled: true,
      auto_send_enabled: true,
      reminder_days: [3, 1],
      expired_reminder_days: [1, 3, 7],
    };

    const targetUserId = settings?.user_id || userId;
    
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, error: "ID do usuário não disponível" }), 
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing reminders for user ${targetUserId}`);
    console.log(`WhatsApp enabled: ${userSettings.whatsapp_reminders_enabled}`);
    console.log(`Reminder days: ${userSettings.reminder_days?.join(', ')}`);

    const now = new Date();
    let totalWhatsAppSent = 0;
    let totalWhatsAppFailed = 0;
    const results: Array<{ client: string; status: string; error?: string }> = [];

    // Process clients expiring in configured days
    for (const days of (userSettings.reminder_days || [3, 1])) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log(`Checking clients expiring in ${days} days`);

      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('expires_at', startOfDay.toISOString())
        .lte('expires_at', endOfDay.toISOString());

      if (clientsError) {
        console.error(`Error fetching clients:`, clientsError);
        continue;
      }

      console.log(`Found ${clients?.length || 0} clients expiring in ${days} days`);
      
      for (const client of (clients || []) as Client[]) {
        if (!client.phone) {
          console.log(`Skipping ${client.name} - no phone`);
          continue;
        }

        // Check if already notified today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: existingNotification } = await supabase
          .from('notification_history')
          .select('id')
          .eq('client_id', client.id)
          .gte('sent_at', today.toISOString())
          .limit(1);

        if (existingNotification && existingNotification.length > 0 && !testMode) {
          console.log(`Skipping ${client.name} - already notified today`);
          continue;
        }

        const planName = planLabels[client.plan] || client.plan;
        const message = generateWhatsAppMessage(client.name, planName, days);
        
        console.log(`Sending to ${client.name}...`);
        const result = await sendWhatsAppUazapi(client.phone, message);

        if (result.success) {
          totalWhatsAppSent++;
          results.push({ client: client.name, status: 'sent' });

          // Log notification
          await supabase.from('notification_history').insert({
            client_id: client.id,
            message_type: 'whatsapp',
            message_content: `Lembrete: ${days} dias para vencer`,
            sent_at: new Date().toISOString(),
          });
        } else {
          totalWhatsAppFailed++;
          results.push({ client: client.name, status: 'failed', error: result.error });
        }

        // Delay between messages
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // Process expired clients
    for (const daysAgo of (userSettings.expired_reminder_days || [1, 3, 7])) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - daysAgo);
      
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log(`Checking clients expired ${daysAgo} days ago`);

      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('expires_at', startOfDay.toISOString())
        .lte('expires_at', endOfDay.toISOString());

      if (clientsError) {
        console.error(`Error fetching expired clients:`, clientsError);
        continue;
      }

      console.log(`Found ${clients?.length || 0} clients expired ${daysAgo} days ago`);

      for (const client of (clients || []) as Client[]) {
        if (!client.phone) continue;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: existingNotification } = await supabase
          .from('notification_history')
          .select('id')
          .eq('client_id', client.id)
          .gte('sent_at', today.toISOString())
          .limit(1);

        if (existingNotification && existingNotification.length > 0 && !testMode) {
          console.log(`Skipping ${client.name} - already notified today`);
          continue;
        }

        const planName = planLabels[client.plan] || client.plan;
        const message = generateWhatsAppMessage(client.name, planName, -daysAgo);
        
        console.log(`Sending expired reminder to ${client.name}...`);
        const result = await sendWhatsAppUazapi(client.phone, message);

        if (result.success) {
          totalWhatsAppSent++;
          results.push({ client: client.name, status: 'sent' });

          await supabase.from('notification_history').insert({
            client_id: client.id,
            message_type: 'whatsapp',
            message_content: `Lembrete: expirou há ${daysAgo} dias`,
            sent_at: new Date().toISOString(),
          });
        } else {
          totalWhatsAppFailed++;
          results.push({ client: client.name, status: 'failed', error: result.error });
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    const response = {
      success: true,
      summary: {
        whatsapp_sent: totalWhatsAppSent,
        whatsapp_failed: totalWhatsAppFailed,
      },
      results,
      test_mode: testMode,
    };

    console.log("Response:", JSON.stringify(response));

    return new Response(
      JSON.stringify(response), 
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Error in auto-send-reminders:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }), 
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
