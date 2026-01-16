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
    let totalWhatsAppGenerated = 0;
    const results: any[] = [];

    for (const settings of settingsList || []) {
      const userSettings = settings as NotificationSettings;
      console.log(`Processing user ${userSettings.user_id} with reminder days: ${userSettings.reminder_days}`);

      // For each reminder day configured
      for (const days of userSettings.reminder_days) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + days);
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`Checking for clients of user ${userSettings.user_id} expiring in ${days} days`);

        // Find clients expiring on target date for this user
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

        for (const client of clients || []) {
          const clientData = client as Client;
          const planName = planLabels[clientData.plan] || clientData.plan;
          const expiresAtDate = new Date(clientData.expires_at);
          const expiresAtFormatted = formatDate(expiresAtDate);

          // Check if we already sent a notification today for this client and day
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
              let subject = `📅 ${clientData.name}, seu plano ${planName} vence em ${days} dia(s)`;
              if (days === 1) {
                subject = `🔔 ${clientData.name}, seu plano ${planName} vence amanhã!`;
              } else if (days === 0) {
                subject = `⚠️ ${clientData.name}, seu plano ${planName} vence hoje!`;
              }

              const html = generateEmailHtml(clientData.name, planName, days, expiresAtFormatted);

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
                message_content: `Lembrete de vencimento - ${days} dias`,
                sent_at: new Date().toISOString(),
              });
            } catch (emailError) {
              console.error(`Error sending email to ${clientData.email}:`, emailError);
            }
          }

          // Generate WhatsApp link if enabled (can't send automatically, but we log it)
          if (userSettings.whatsapp_reminders_enabled && clientData.phone) {
            const whatsappMessage = generateWhatsAppMessage(clientData.name, planName, days);
            const formattedPhone = formatPhoneForWhatsApp(clientData.phone);
            const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMessage)}`;
            
            console.log(`WhatsApp link generated for ${clientData.name}: ${whatsappUrl}`);
            totalWhatsAppGenerated++;

            // Log to notification history
            await supabase.from('notification_history').insert({
              client_id: clientData.id,
              message_type: 'whatsapp',
              message_content: `Lembrete de vencimento - ${days} dias (link gerado)`,
              sent_at: new Date().toISOString(),
            });
          }
        }

        results.push({
          user_id: userSettings.user_id,
          day: days,
          clientsFound: clients?.length || 0,
        });
      }
    }

    console.log(`Auto-send complete. Emails: ${totalEmailsSent}, WhatsApp links: ${totalWhatsAppGenerated}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalEmailsSent,
        totalWhatsAppGenerated,
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
