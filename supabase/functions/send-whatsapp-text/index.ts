// Uazapi - Send WhatsApp Text Message
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendWhatsAppTextRequest {
  phone: string;
  message: string;
}

function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters
  const numbersOnly = phone.replace(/\D/g, '');
  
  // If the number doesn't start with country code, add Brazil's code (55)
  if (numbersOnly.length <= 11) {
    return `55${numbersOnly}`;
  }
  
  return numbersOnly;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const uazapiUrl = Deno.env.get("UAZAPI_URL");
    const uazapiToken = Deno.env.get("UAZAPI_TOKEN");

    if (!uazapiUrl || !uazapiToken) {
      console.error("Missing Uazapi configuration");
      return new Response(
        JSON.stringify({ error: "UAZAPI_URL or UAZAPI_TOKEN not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { phone, message }: SendWhatsAppTextRequest = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "Phone and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedPhone = formatPhoneForWhatsApp(phone);
    
    console.log(`Sending text message to ${formattedPhone}`);
    console.log(`Message preview: ${message.substring(0, 50)}...`);

    // Uazapi uses /message/text endpoint for text messages
    const response = await fetch(`${uazapiUrl}/message/text`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${uazapiToken}`,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
      }),
    });

    const responseText = await response.text();
    console.log("Uazapi response:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error("Uazapi API error:", responseData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to send WhatsApp message", 
          details: responseData 
        }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("WhatsApp text message sent successfully:", responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "WhatsApp message sent successfully", 
        data: responseData 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-whatsapp-text function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
