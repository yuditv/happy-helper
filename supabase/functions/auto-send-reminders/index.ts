// Auto Send Reminders - Uazapi Integration - v3
// Uses UAZAPI_TOKEN and UAZAPI_URL directly from secrets
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

interface RequestBody {
  settings?: NotificationSettings;
  test_mode?: boolean;
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

// Send WhatsApp message via Uazapi using direct secrets
async function sendWhatsAppUazapi(
  phone: string, 
  message: string
): Promise<{ success: boolean; error?: string }> {
  const uazapiToken = Deno.env.get("UAZAPI_TOKEN");
  const uazapiUrl = Deno.env.get("UAZAPI_URL");

  if (!uazapiToken || !uazapiUrl) {
    console.log("Uazapi not configured (missing UAZAPI_TOKEN or UAZAPI_URL)");
    return { success: false, error: "Uazapi not configured - missing UAZAPI_TOKEN or UAZAPI_URL" };
  }

  const formattedPhone = formatPhoneForWhatsApp(phone);
  
  // Clean URL and build endpoint
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

    // Parse request body - settings can come from request or we use defaults
    let requestBody: RequestBody = {};
    try {
      const text = await req.text();
      if (text) {
        requestBody = JSON.parse(text);
      }
    } catch {
      // Empty body is OK
    }

    // Get user ID from auth header if available
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch {
        // Ignore auth errors for cron jobs
      }
    }

    // Settings can come from request body or we'll process for a specific user
    const settings = requestBody.settings;
    const testMode = requestBody.test_mode || false;

    if (testMode) {
      console.log("Running in test mode");
    }

    // If settings provided in body, process for that user
    // Otherwise, if we have a userId, query their clients
    // For cron jobs without auth, we would need settings in body

    if (!settings && !userId) {
      console.log("No settings provided and no authenticated user. For cron jobs, pass settings in request body.");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No settings provided. Pass settings in request body or authenticate." 
        }), 
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const userSettings: NotificationSettings = settings || {
      user_id: userId!,
      email_reminders_enabled: false,
      whatsapp_reminders_enabled: true,
      auto_send_enabled: true,
      reminder_days: [7, 3, 1],
      expired_reminder_days: [1, 3, 7],
    };

    const targetUserId = userSettings.user_id || userId;
    
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, error: "No user ID available" }), 
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Processing reminders for user ${targetUserId}`);
    console.log(`Settings: email=${userSettings.email_reminders_enabled}, whatsapp=${userSettings.whatsapp_reminders_enabled}`);
    console.log(`Reminder days: ${userSettings.reminder_days.join(', ')}`);

    const now = new Date();
    let totalEmailsSent = 0;
    let totalWhatsAppSent = 0;
    let totalWhatsAppFailed = 0;
    const results: any[] = [];
    const processedClients: string[] = [];

    // Helper function to process clients and send notifications
    async function processClients(clients: Client[], daysRemaining: number) {
      for (const clientData of clients) {
        // Skip if already processed this run
        if (processedClients.includes(clientData.id)) {
          console.log(`Skipping ${clientData.name} - already processed this run`);
          continue;
        }

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

        if (existingNotification && existingNotification.length > 0 && !testMode) {
          console.log(`Skipping client ${clientData.name} - already notified today`);
          continue;
        }

        processedClients.push(clientData.id);

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
          
          const result = await sendWhatsAppUazapi(clientData.phone, whatsappMessage);
          
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

      console.log(`Checking for clients expiring in ${days} days (${startOfDay.toISOString()} - ${endOfDay.toISOString()})`);

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
      
      if (clients && clients.length > 0) {
        await processClients(clients as Client[], days);
      }

      results.push({
        day: days,
        clientsFound: clients?.length || 0,
        type: 'expiring'
      });
    }

    // 2. Process EXPIRED clients
    const expiredDays = userSettings.expired_reminder_days || [1, 3, 7, 14, 30];
    
    for (const daysAgo of expiredDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - daysAgo);
      
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log(`Checking for clients expired ${daysAgo} days ago`);

      const { data: expiredClients, error: expiredError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('expires_at', startOfDay.toISOString())
        .lte('expires_at', endOfDay.toISOString());

      if (expiredError) {
        console.error(`Error fetching expired clients:`, expiredError);
        continue;
      }

      console.log(`Found ${expiredClients?.length || 0} clients expired ${daysAgo} days ago`);
      
      if (expiredClients && expiredClients.length > 0) {
        await processClients(expiredClients as Client[], -daysAgo);
      }

      results.push({
        day: -daysAgo,
        clientsFound: expiredClients?.length || 0,
        type: 'expired'
      });
    }

    console.log(`Auto-send complete. Emails: ${totalEmailsSent}, WhatsApp sent: ${totalWhatsAppSent}, WhatsApp failed: ${totalWhatsAppFailed}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalEmailsSent,
        totalWhatsAppSent,
        totalWhatsAppFailed,
        processedClients: processedClients.length,
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
