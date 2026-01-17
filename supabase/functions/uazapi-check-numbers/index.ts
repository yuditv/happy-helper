// Uazapi - Check WhatsApp Numbers
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckNumbersRequest {
  phones: string[];
}

interface NumberCheckResult {
  phone: string;
  formattedPhone: string;
  hasWhatsApp: boolean;
  jid?: string;
}

function formatPhoneForWhatsApp(phone: string): string {
  const numbersOnly = phone.replace(/\D/g, '');
  if (numbersOnly.length <= 11) {
    return `55${numbersOnly}`;
  }
  return numbersOnly;
}

serve(async (req: Request): Promise<Response> => {
  console.log("=== UAZAPI CHECK NUMBERS ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const uazapiUrl = "https://yudipro.uazapi.com";
    const uazapiToken = Deno.env.get("UAZAPI_TOKEN");

    if (!uazapiToken) {
      return new Response(
        JSON.stringify({ error: "UAZAPI_TOKEN not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { phones }: CheckNumbersRequest = await req.json();

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return new Response(
        JSON.stringify({ error: "phones array is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Checking ${phones.length} phone numbers`);

    const results: NumberCheckResult[] = [];
    let withWhatsApp = 0;
    let withoutWhatsApp = 0;

    // Process in batches to avoid rate limiting
    for (const phone of phones) {
      const formattedPhone = formatPhoneForWhatsApp(phone);
      
      try {
        const response = await fetch(`${uazapiUrl}/chat/check-number`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${uazapiToken}`,
          },
          body: JSON.stringify({ phone: formattedPhone }),
        });

        const data = await response.json();
        console.log(`Check ${formattedPhone}:`, data);

        const hasWhatsApp = data.exists === true || data.hasWhatsApp === true || data.registered === true;
        
        results.push({
          phone,
          formattedPhone,
          hasWhatsApp,
          jid: data.jid || data.id,
        });

        if (hasWhatsApp) {
          withWhatsApp++;
        } else {
          withoutWhatsApp++;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Error checking ${phone}:`, err);
        results.push({
          phone,
          formattedPhone,
          hasWhatsApp: false,
        });
        withoutWhatsApp++;
      }
    }

    console.log(`Results: ${withWhatsApp} with WhatsApp, ${withoutWhatsApp} without`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: phones.length,
          withWhatsApp,
          withoutWhatsApp,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
