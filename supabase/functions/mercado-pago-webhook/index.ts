import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Send WhatsApp notification to user
async function sendPaymentConfirmationWhatsApp(
  supabase: any,
  userId: string,
  planName: string,
  amount: number,
  periodEnd: Date
) {
  try {
    // Get user's WhatsApp from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("whatsapp, display_name")
      .eq("user_id", userId)
      .single();

    if (!profile?.whatsapp) {
      console.log("[mercado-pago-webhook] User has no WhatsApp configured");
      return;
    }

    const userName = profile.display_name || "Cliente";
    const formattedAmount = new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(amount);
    const formattedDate = periodEnd.toLocaleDateString('pt-BR');

    const message = `✅ *Pagamento Confirmado!*\n\nOlá ${userName}!\n\nSeu pagamento de ${formattedAmount} para o plano *${planName}* foi confirmado com sucesso!\n\n📅 Válido até: ${formattedDate}\n\nObrigado por renovar conosco! 🚀`;

    // Get user's default WhatsApp instance
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("instance_key")
      .eq("user_id", userId)
      .eq("status", "connected")
      .limit(1)
      .single();

    const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
    const UAZAPI_TOKEN = instance?.instance_key || Deno.env.get("UAZAPI_TOKEN");

    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      console.log("[mercado-pago-webhook] UAZAPI not configured, skipping WhatsApp notification");
      return;
    }

    // Format phone number
    let phone = profile.whatsapp.replace(/\D/g, '');
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }

    const response = await fetch(`${UAZAPI_URL}/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": UAZAPI_TOKEN,
      },
      body: JSON.stringify({
        phone,
        message,
      }),
    });

    if (response.ok) {
      console.log("[mercado-pago-webhook] WhatsApp notification sent successfully");
    } else {
      console.error("[mercado-pago-webhook] Failed to send WhatsApp:", await response.text());
    }
  } catch (error) {
    console.error("[mercado-pago-webhook] Error sending WhatsApp notification:", error);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Webhook do Mercado Pago - não requer autenticação do usuário
    const body = await req.json();
    
    console.log("[mercado-pago-webhook] Received:", JSON.stringify(body));

    // Verificar tipo de notificação
    if (body.type !== "payment" || body.action !== "payment.updated") {
      console.log("[mercado-pago-webhook] Ignoring notification type:", body.type);
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const externalPaymentId = body.data?.id;
    if (!externalPaymentId) {
      console.log("[mercado-pago-webhook] No payment ID in notification");
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar pagamento no banco pelo external_id
    const { data: payment, error: paymentError } = await supabase
      .from("subscription_payments")
      .select("*, subscription:user_subscriptions(*)")
      .eq("external_id", externalPaymentId.toString())
      .single();

    if (paymentError || !payment) {
      console.log("[mercado-pago-webhook] Payment not found:", externalPaymentId);
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar status no Mercado Pago
    const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;
    
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${externalPaymentId}`,
      {
        headers: {
          "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      }
    );

    const mpData = await mpResponse.json();
    console.log("[mercado-pago-webhook] MP Status:", mpData.status);

    if (mpData.status === "approved" && payment.status !== "paid") {
      console.log("[mercado-pago-webhook] Payment approved, activating subscription");

      // Buscar plano para saber a duração e nome
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("duration_months, name")
        .eq("id", payment.plan_id)
        .single();

      const durationMonths = plan?.duration_months || 1;
      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + durationMonths);

      // Atualizar pagamento
      await supabase
        .from("subscription_payments")
        .update({ 
          status: "paid",
          paid_at: new Date().toISOString()
        })
        .eq("id", payment.id);

      // Atualizar subscription
      await supabase
        .from("user_subscriptions")
        .update({
          status: "active",
          plan_id: payment.plan_id,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          trial_ends_at: null,
        })
        .eq("id", payment.subscription_id);

      console.log("[mercado-pago-webhook] Subscription activated successfully");

      // Send WhatsApp notification
      await sendPaymentConfirmationWhatsApp(
        supabase,
        payment.subscription.user_id,
        plan?.name || "Premium",
        mpData.transaction_amount || payment.amount,
        periodEnd
      );
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[mercado-pago-webhook] Error:", error);
    // Sempre retorna 200 para o Mercado Pago não retentar
    return new Response(
      JSON.stringify({ received: true, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
