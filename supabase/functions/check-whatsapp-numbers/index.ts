import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
  // Remove all non-numeric characters
  const numbersOnly = phone.replace(/\D/g, '');
  
  // If it doesn't start with country code, add Brazil's code
  if (numbersOnly.length <= 11) {
    return `55${numbersOnly}`;
  }
  
  return numbersOnly;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE");

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
      console.error("Missing Evolution API configuration");
      return new Response(
        JSON.stringify({ 
          error: "Evolution API não configurada. Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE." 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { phones }: CheckNumbersRequest = await req.json();

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return new Response(
        JSON.stringify({ error: "Lista de telefones é obrigatória" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Checking ${phones.length} phone numbers for WhatsApp`);

    const results: NumberCheckResult[] = [];
    
    // Process in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (phone) => {
        const formattedPhone = formatPhoneForWhatsApp(phone);
        
        try {
          // Evolution API endpoint for checking WhatsApp number
          const apiUrl = `${evolutionApiUrl}/chat/whatsappNumbers/${evolutionInstance}`;
          
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": evolutionApiKey,
            },
            body: JSON.stringify({
              numbers: [formattedPhone],
            }),
          });

          const responseData = await response.json();
          
          console.log(`Check result for ${formattedPhone}:`, JSON.stringify(responseData));

          // Parse response - Evolution API returns array with exists property
          if (Array.isArray(responseData) && responseData.length > 0) {
            const result = responseData[0];
            return {
              phone: phone,
              formattedPhone: formattedPhone,
              hasWhatsApp: result.exists === true,
              jid: result.jid || undefined,
            };
          }
          
          return {
            phone: phone,
            formattedPhone: formattedPhone,
            hasWhatsApp: false,
          };
        } catch (error) {
          console.error(`Error checking ${formattedPhone}:`, error);
          return {
            phone: phone,
            formattedPhone: formattedPhone,
            hasWhatsApp: false,
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < phones.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const withWhatsApp = results.filter(r => r.hasWhatsApp);
    const withoutWhatsApp = results.filter(r => !r.hasWhatsApp);

    console.log(`Check complete: ${withWhatsApp.length} with WhatsApp, ${withoutWhatsApp.length} without`);

    return new Response(
      JSON.stringify({ 
        success: true,
        total: results.length,
        withWhatsApp: withWhatsApp.length,
        withoutWhatsApp: withoutWhatsApp.length,
        results: results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-whatsapp-numbers function:", error);
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
