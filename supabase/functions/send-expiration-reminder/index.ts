import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  clientId: string;
  clientName: string;
  clientEmail: string;
  planName: string;
  daysRemaining: number;
  expiresAt: string;
  planPrice?: number;
  customSubject?: string;
  customContent?: string;
}

function replaceTemplateVariables(
  template: string,
  clientName: string,
  planName: string,
  daysRemaining: number,
  expiresAt: string,
  planPrice?: number
): string {
  const priceFormatted = planPrice 
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(planPrice)
    : 'R$ 0,00';
    
  return template
    .replace(/\{nome\}/g, clientName)
    .replace(/\{plano\}/g, planName)
    .replace(/\{dias\}/g, Math.abs(daysRemaining).toString())
    .replace(/\{data_vencimento\}/g, expiresAt)
    .replace(/\{valor\}/g, priceFormatted);
}

function generateEmailHtml(
  clientName: string, 
  planName: string, 
  daysRemaining: number, 
  expiresAt: string,
  customContent?: string,
  planPrice?: number
): string {
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

  // If custom content is provided, use it
  const bodyContent = customContent 
    ? replaceTemplateVariables(customContent, clientName, planName, daysRemaining, expiresAt, planPrice)
        .split('\n').map(line => `<p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">${line || '&nbsp;'}</p>`).join('')
    : `
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Olá <strong>${clientName}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 24px 0;">
        Para continuar utilizando nossos serviços sem interrupção, renove sua assinatura o quanto antes.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0;">
        Caso tenha alguma dúvida, estamos à disposição para ajudar!
      </p>
    `;

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
          <div style="background-color: ${statusColor}15; border-left: 4px solid ${statusColor}; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
            <p style="color: ${statusColor}; font-weight: 600; margin: 0; font-size: 16px;">
              ${statusText}
            </p>
          </div>
          ${bodyContent}
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
              ${planPrice ? `
              <tr>
                <td style="color: #6b7280; padding: 8px 0;">Valor:</td>
                <td style="color: #111827; font-weight: 600; text-align: right; padding: 8px 0;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(planPrice)}</td>
              </tr>
              ` : ''}
            </table>
          </div>
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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-expiration-reminder function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      clientId, 
      clientName, 
      clientEmail, 
      planName, 
      daysRemaining, 
      expiresAt,
      planPrice,
      customSubject,
      customContent
    }: EmailRequest = await req.json();

    console.log(`Sending expiration reminder to ${clientEmail} for client ${clientName}`);

    if (!clientEmail || !clientName) {
      throw new Error("Missing required fields: clientEmail and clientName");
    }

    const html = generateEmailHtml(clientName, planName, daysRemaining, expiresAt, customContent, planPrice);

    let subject = "";
    if (customSubject) {
      subject = replaceTemplateVariables(customSubject, clientName, planName, daysRemaining, expiresAt, planPrice);
    } else if (daysRemaining < 0) {
      subject = `⚠️ ${clientName}, seu plano ${planName} venceu!`;
    } else if (daysRemaining === 0) {
      subject = `🔔 ${clientName}, seu plano ${planName} vence hoje!`;
    } else {
      subject = `📅 ${clientName}, seu plano ${planName} vence em ${daysRemaining} dia(s)`;
    }

    const emailResponse = await resend.emails.send({
      from: "Sistema de Clientes <onboarding@resend.dev>",
      to: [clientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending expiration reminder:", error);
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
