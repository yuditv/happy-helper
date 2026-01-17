// Auto Send Reminders - Uazapi Integration - v2
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
  user_id: string;
  email_reminders_enabled: boolean;
  whatsapp_reminders_enabled: boolean;
  auto_send_enabled: boolean;
  reminder_days: number[];
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

function generateEmailHtml(clientName: string, planName: string, daysRemaining: number, expiresAt: string): string {
  let statusText = "";
  let statusColor = "#f59e0b";

  if (daysRemaining < 0) {
    statusText = `Seu plano venceu há ${Math.abs(daysRemaining)} dia(s)`;
    statusColor = "#ef4444";
  } else if (daysRemaining === 0) {
    statusText = "Seu plano vence hoje!";
    statusColor = "#ef4444";
  } else {
    statusText = `Seu plano vence em ${daysRemaining} dia(s)`;
    statusColor = "#f59e0b";
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Lembrete de Renovação</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
            Olá <strong>${clientName}</strong>,
          </p>
          <div style="background-color: ${statusColor}15; border-left: 4px solid ${statusColor}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <p style="color: ${statusColor}; font-weight: 600; margin: 0; font-size: 16px;">
              ${statusText}
            </p>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #6b7280; padding: 8px 0;">Plano:</td>
                <td style="color: #111827; font-weight: 600; text-align: right; padding: 8px 0;">${planName}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding: 8px 0;">Vencimento:</td>
                <td style="color: #111827; font-weight: 600; text-align: right; padding: 8px 0;">${expiresAt}</td>
              </tr>
            </table>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 24px 0;">
            Para continuar utilizando nossos serviços sem interrupção, renove sua assinatura o quanto antes.
          </p>
          <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0;">
            Caso tenha alguma dúvida, estamos à disposição para ajudar!
          </p>
        </div>
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Este é um email automático. Por favor, não responda.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function formatDate(date: Date): string {
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
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

function formatPhoneForWhatsApp(phone: string): string {
  const numbersOnly = phone.replace(/\D/g, '');
  if (numbersOnly.length <= 11) {
    return `55${numbersOnly}`;
  }
  return numbersOnly;
}

// Send WhatsApp message via Uazapi
async function sendWhatsAppUazapi(
  phone: string, 
  message: string, 
  userId: string,
  supabase: any
): Promise<{ success: boolean; error?: string }> {
  const uazapiAdminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");

  if (!uazapiAdminToken) {
    console.log("Uazapi not configured, skipping WhatsApp send");
    return { success: false, error: "Uazapi not configured" };
  }

  // Get user's WhatsApp instance
  const { data: instance, error: instanceError } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .limit(1)
    .single();

  if (instanceError || !instance) {
    console.log(`No connected WhatsApp instance for user ${userId}`);
    return { success: false, error: "No connected WhatsApp instance" };
  }

  const formattedPhone = formatPhoneForWhatsApp(phone);
  const apiUrl = `https://uazapi.com.br/api/v1/${instance.instance_id}/messages/text`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${instance.token}`,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Uazapi error:", responseData);
      return { success: false, error: JSON.stringify(responseData) };
    }

    console.log("WhatsApp message sent successfully via Uazapi:", responseData);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending WhatsApp via Uazapi:", error);
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("auto-send-reminders function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with auto_send_enabled
    const { data: settingsList, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('auto_send_enabled', true);

    if (settingsError) {
      console.error('Error fetching notification settings:', settingsError);
      throw settingsError;
    }

    console.log(`Found ${settingsList?.length || 0} users with auto-send enabled`);

    const now = new Date();
    let totalEmailsSent = 0;
    let totalWhatsAppSent = 0;
    let totalWhatsAppFailed = 0;
    const results: any[] = [];

    for (const settings of settingsList || []) {
      const userSettings = settings as NotificationSettings;
      console.log(`Processing user ${userSettings.user_id} with reminder days: ${userSettings.reminder_days}`);

      // Helper function to process clients and send notifications
      async function processClients(clients: Client[], daysRemaining: number) {
        for (const clientData of clients) {
          const planName = planLabels[clientData.plan] || clientData.plan;
          const expiresAtDate = new Date(clientData.expires_at);
          const expiresAtFormatted = formatDate(expiresAtDate);

          // Check if we already sent a notification today for this client
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          const { data: existingNotification } = await supabase
            .from('notification_history')
            .select('id')
            .eq('client_id', clientData.id)
            .gte('sent_at', today.toISOString())
            .lte('sent_at', todayEnd.toISOString())
            .limit(1);

          if (existingNotification && existingNotification.length > 0) {
            console.log(`Skipping client ${clientData.name} - already notified today`);
            continue;
          }

          // Send email if enabled
          if (userSettings.email_reminders_enabled && clientData.email) {
            try {
              let subject = "";
              if (daysRemaining < 0) {
                subject = `🚨 ${clientData.name}, seu plano ${planName} expirou há ${Math.abs(daysRemaining)} dia(s)!`;
              } else if (daysRemaining === 0) {
                subject = `⚠️ ${clientData.name}, seu plano ${planName} vence hoje!`;
              } else if (daysRemaining === 1) {
                subject = `🔔 ${clientData.name}, seu plano ${planName} vence amanhã!`;
              } else {
                subject = `📅 ${clientData.name}, seu plano ${planName} vence em ${daysRemaining} dia(s)`;
              }

              const html = generateEmailHtml(clientData.name, planName, daysRemaining, expiresAtFormatted);

              const emailResponse = await resend.emails.send({
                from: "Sistema de Clientes <onboarding@resend.dev>",
                to: [clientData.email],
                subject,
                html,
              });

              console.log(`Email sent to ${clientData.email}:`, emailResponse);
              totalEmailsSent++;

              // Log to notification history
              await supabase.from('notification_history').insert({
                client_id: clientData.id,
                message_type: 'email',
                message_content: daysRemaining < 0 
                  ? `Lembrete de expiração - expirado há ${Math.abs(daysRemaining)} dias`
                  : `Lembrete de vencimento - ${daysRemaining} dias`,
                sent_at: new Date().toISOString(),
              });
            } catch (emailError) {
              console.error(`Error sending email to ${clientData.email}:`, emailError);
            }
          }

          // Send WhatsApp message via Uazapi if enabled
          if (userSettings.whatsapp_reminders_enabled && clientData.phone) {
            const whatsappMessage = generateWhatsAppMessage(clientData.name, planName, daysRemaining);
            
            console.log(`Sending WhatsApp to ${clientData.name} (${clientData.phone})...`);
            
            const result = await sendWhatsAppUazapi(clientData.phone, whatsappMessage, userSettings.user_id, supabase);
            
            if (result.success) {
              totalWhatsAppSent++;
              console.log(`WhatsApp sent successfully to ${clientData.name}`);
              
              // Log to notification history
              await supabase.from('notification_history').insert({
                client_id: clientData.id,
                message_type: 'whatsapp',
                message_content: daysRemaining < 0 
                  ? `Lembrete de expiração - expirado há ${Math.abs(daysRemaining)} dias (Uazapi)`
                  : `Lembrete de vencimento - ${daysRemaining} dias (Uazapi)`,
                sent_at: new Date().toISOString(),
              });
            } else {
              totalWhatsAppFailed++;
              console.error(`Failed to send WhatsApp to ${clientData.name}: ${result.error}`);
              
              // Log failed attempt
              await supabase.from('notification_history').insert({
                client_id: clientData.id,
                message_type: 'whatsapp',
                message_content: `Lembrete falhou - ${daysRemaining} dias (${result.error})`,
                sent_at: new Date().toISOString(),
              });
            }

            // Small delay between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }

      // 1. Process clients EXPIRING in configured days
      for (const days of userSettings.reminder_days) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + days);
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`Checking for clients of user ${userSettings.user_id} expiring in ${days} days`);

        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', userSettings.user_id)
          .gte('expires_at', startOfDay.toISOString())
          .lte('expires_at', endOfDay.toISOString());

        if (clientsError) {
          console.error(`Error fetching clients for user ${userSettings.user_id}:`, clientsError);
          continue;
        }

        console.log(`Found ${clients?.length || 0} clients expiring in ${days} days for user ${userSettings.user_id}`);
        
        if (clients && clients.length > 0) {
          await processClients(clients as Client[], days);
        }

        results.push({
          user_id: userSettings.user_id,
          day: days,
          clientsFound: clients?.length || 0,
          type: 'expiring'
        });
      }

      // 2. Process EXPIRED clients (up to 30 days ago)
      const expiredDays = [1, 3, 7, 14, 30]; // Days after expiration to send reminders
      
      for (const daysAgo of expiredDays) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - daysAgo);
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`Checking for clients of user ${userSettings.user_id} expired ${daysAgo} days ago`);

        const { data: expiredClients, error: expiredError } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', userSettings.user_id)
          .gte('expires_at', startOfDay.toISOString())
          .lte('expires_at', endOfDay.toISOString());

        if (expiredError) {
          console.error(`Error fetching expired clients for user ${userSettings.user_id}:`, expiredError);
          continue;
        }

        console.log(`Found ${expiredClients?.length || 0} clients expired ${daysAgo} days ago for user ${userSettings.user_id}`);
        
        if (expiredClients && expiredClients.length > 0) {
          await processClients(expiredClients as Client[], -daysAgo);
        }

        results.push({
          user_id: userSettings.user_id,
          day: -daysAgo,
          clientsFound: expiredClients?.length || 0,
          type: 'expired'
        });
      }
    }

    console.log(`Auto-send complete. Emails: ${totalEmailsSent}, WhatsApp sent: ${totalWhatsAppSent}, WhatsApp failed: ${totalWhatsAppFailed}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalEmailsSent,
        totalWhatsAppSent,
        totalWhatsAppFailed,
        results,
        timestamp: new Date().toISOString()
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in auto-send-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
