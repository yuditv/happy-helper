import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledMessage {
  id: string;
  user_id: string;
  client_id: string;
  message_type: string;
  custom_message: string | null;
  scheduled_at: string;
  status: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  plan: string;
  expires_at: string;
}

function generateEmailHtml(clientName: string, planName: string, daysRemaining: number, expiresAt: string): string {
  let statusText = "";
  let statusColor = "";
  
  if (daysRemaining < 0) {
    statusText = `venceu há ${Math.abs(daysRemaining)} dia(s)`;
    statusColor = "#ef4444";
  } else if (daysRemaining === 0) {
    statusText = "vence hoje";
    statusColor = "#f59e0b";
  } else {
    statusText = `vence em ${daysRemaining} dia(s)`;
    statusColor = "#3b82f6";
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Lembrete de Renovação</h1>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
            Olá <strong>${clientName}</strong>,
          </p>
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid ${statusColor};">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Status do seu plano:</p>
            <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 600; color: ${statusColor};">
              Seu plano ${planName} ${statusText}
            </p>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
              Data de vencimento: ${expiresAt}
            </p>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
            Para continuar utilizando nossos serviços sem interrupção, renove sua assinatura o quanto antes.
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            Se você tiver alguma dúvida, não hesite em entrar em contato conosco.
          </p>
        </div>
        <div style="background-color: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            Esta é uma mensagem agendada automaticamente.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending scheduled messages that are due
    const now = new Date().toISOString();
    const { data: scheduledMessages, error: fetchError } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .limit(50);

    if (fetchError) {
      console.error("Error fetching scheduled messages:", fetchError);
      throw fetchError;
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      console.log("No pending messages to process");
      return new Response(
        JSON.stringify({ message: "No pending messages", processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing ${scheduledMessages.length} scheduled messages`);

    let successCount = 0;
    let failCount = 0;

    for (const scheduled of scheduledMessages as ScheduledMessage[]) {
      try {
        // Get client info
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", scheduled.client_id)
          .single();

        if (clientError || !client) {
          console.error(`Client not found for scheduled message ${scheduled.id}`);
          await supabase
            .from("scheduled_messages")
            .update({ 
              status: "failed", 
              error_message: "Cliente não encontrado",
              sent_at: new Date().toISOString()
            })
            .eq("id", scheduled.id);
          failCount++;
          continue;
        }

        const typedClient = client as Client;
        
        // Calculate days remaining
        const expiresAt = new Date(typedClient.expires_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiresAt.setHours(0, 0, 0, 0);
        const diffTime = expiresAt.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Format plan name
        const planLabels: Record<string, string> = {
          monthly: "Mensal",
          quarterly: "Trimestral",
          semiannual: "Semestral",
          annual: "Anual"
        };
        const planName = planLabels[typedClient.plan] || typedClient.plan;

        // Format expiration date
        const formattedExpires = expiresAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        });

        if (scheduled.message_type === "email") {
          // Send email
          const emailHtml = generateEmailHtml(typedClient.name, planName, daysRemaining, formattedExpires);
          
          const subject = daysRemaining < 0 
            ? `⚠️ ${typedClient.name}, seu plano ${planName} venceu!`
            : daysRemaining === 0
            ? `🔔 ${typedClient.name}, seu plano ${planName} vence hoje!`
            : `📅 ${typedClient.name}, seu plano ${planName} vence em ${daysRemaining} dia(s)`;

          const emailResponse = await resend.emails.send({
            from: "Gerenciador de Clientes <onboarding@resend.dev>",
            to: [typedClient.email],
            subject,
            html: emailHtml,
          });

          console.log(`Email sent to ${typedClient.email}:`, emailResponse);

          // Update scheduled message status
          await supabase
            .from("scheduled_messages")
            .update({ 
              status: "sent", 
              sent_at: new Date().toISOString()
            })
            .eq("id", scheduled.id);

          // Record notification history
          await supabase.from("notification_history").insert({
            client_id: typedClient.id,
            user_id: scheduled.user_id,
            notification_type: "email",
            subject,
            status: "sent",
            days_until_expiration: daysRemaining,
          });

          successCount++;
        } else if (scheduled.message_type === "whatsapp") {
          // For WhatsApp, we just mark as sent since it needs to be opened manually
          // The message is stored and the user can open it via the UI
          await supabase
            .from("scheduled_messages")
            .update({ 
              status: "sent", 
              sent_at: new Date().toISOString()
            })
            .eq("id", scheduled.id);

          // Record notification history
          const subject = `WhatsApp agendado para ${typedClient.name}`;
          await supabase.from("notification_history").insert({
            client_id: typedClient.id,
            user_id: scheduled.user_id,
            notification_type: "whatsapp",
            subject,
            status: "sent",
            days_until_expiration: daysRemaining,
          });

          successCount++;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        console.error(`Error processing scheduled message ${scheduled.id}:`, error);
        await supabase
          .from("scheduled_messages")
          .update({ 
            status: "failed", 
            error_message: errorMessage,
            sent_at: new Date().toISOString()
          })
          .eq("id", scheduled.id);
        failCount++;
      }
    }

    console.log(`Processed: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: "Processing complete", 
        processed: scheduledMessages.length,
        success: successCount,
        failed: failCount
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in process-scheduled-messages:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
