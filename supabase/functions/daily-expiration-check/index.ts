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

const handler = async (req: Request): Promise<Response> => {
  console.log("daily-expiration-check function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date at midnight UTC
    const now = new Date();
    
    // Calculate target dates for 7, 3, and 1 days from now
    const targetDays = [7, 3, 1];
    
    let totalEmailsSent = 0;
    const results: { day: number; clientsNotified: string[] }[] = [];

    for (const days of targetDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      
      // Set to start and end of target day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log(`Checking for clients expiring in ${days} days (${startOfDay.toISOString()} - ${endOfDay.toISOString()})`);

      // Find clients expiring on target date
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .gte('expires_at', startOfDay.toISOString())
        .lte('expires_at', endOfDay.toISOString());

      if (error) {
        console.error(`Error fetching clients for ${days} days:`, error);
        continue;
      }

      console.log(`Found ${clients?.length || 0} clients expiring in ${days} days`);

      const clientsNotified: string[] = [];

      if (clients && clients.length > 0) {
        for (const client of clients) {
          try {
            const planName = planLabels[client.plan] || client.plan;
            const expiresAtDate = new Date(client.expires_at);
            const expiresAtFormatted = formatDate(expiresAtDate);

            let subject = `📅 ${client.name}, seu plano ${planName} vence em ${days} dia(s)`;
            if (days === 1) {
              subject = `🔔 ${client.name}, seu plano ${planName} vence amanhã!`;
            }

            const html = generateEmailHtml(client.name, planName, days, expiresAtFormatted);

            const emailResponse = await resend.emails.send({
              from: "Sistema de Clientes <onboarding@resend.dev>",
              to: [client.email],
              subject,
              html,
            });

            console.log(`Email sent to ${client.email}:`, emailResponse);
            clientsNotified.push(client.name);
            totalEmailsSent++;
          } catch (emailError) {
            console.error(`Error sending email to ${client.email}:`, emailError);
          }
        }
      }

      results.push({ day: days, clientsNotified });
    }

    console.log(`Daily check complete. Total emails sent: ${totalEmailsSent}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalEmailsSent,
        results,
        timestamp: new Date().toISOString()
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in daily-expiration-check:", error);
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
