import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReferralNotificationRequest {
  referrerId: string;
  referrerName?: string;
  discountAmount: number;
}

function generateEmailHtml(referrerName: string, discountAmount: number): string {
  const formattedAmount = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(discountAmount);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Indicação Validada!</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
            Olá${referrerName ? ` <strong>${referrerName}</strong>` : ''},
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            Temos uma ótima notícia! Uma pessoa que você indicou acabou de assinar um plano e sua indicação foi validada com sucesso! 🚀
          </p>
          <div style="background: linear-gradient(135deg, #10b98115 0%, #05966915 100%); border: 2px solid #10b981; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
            <p style="color: #059669; font-size: 14px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Você ganhou</p>
            <p style="color: #047857; font-size: 32px; font-weight: 700; margin: 0;">${formattedAmount}</p>
            <p style="color: #059669; font-size: 14px; margin: 8px 0 0;">de desconto na sua próxima mensalidade!</p>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
            Continue indicando amigos e ganhe mais descontos! Acesse o sistema para ver seu saldo de descontos acumulados.
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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-referral-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      referrerId, 
      referrerName,
      discountAmount
    }: ReferralNotificationRequest = await req.json();

    console.log(`Sending referral notification to referrer ID: ${referrerId}`);

    if (!referrerId) {
      throw new Error("Missing required field: referrerId");
    }

    // Create admin client to get user email
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get user email from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(referrerId);

    if (userError || !userData?.user?.email) {
      console.error("Error getting referrer email:", userError);
      throw new Error("Could not get referrer email");
    }

    const referrerEmail = userData.user.email;
    console.log(`Found referrer email: ${referrerEmail}`);

    const html = generateEmailHtml(referrerName || '', discountAmount);

    const formattedAmount = new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(discountAmount);

    const emailResponse = await resend.emails.send({
      from: "Sistema de Clientes <onboarding@resend.dev>",
      to: [referrerEmail],
      subject: `🎉 Parabéns! Sua indicação foi validada e você ganhou ${formattedAmount}!`,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending referral notification:", error);
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
