// Uazapi - Send WhatsApp Text Message
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  console.log("=== send-whatsapp-text function called ===");
  console.log("Method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const uazapiUrl = Deno.env.get("UAZAPI_URL");
    const uazapiToken = Deno.env.get("UAZAPI_TOKEN");

    console.log("UAZAPI_URL exists:", !!uazapiUrl);
    console.log("UAZAPI_TOKEN exists:", !!uazapiToken);

    if (!uazapiUrl) {
      console.error("UAZAPI_URL not configured");
      return new Response(
        JSON.stringify({ success: false, error: "UAZAPI_URL not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!uazapiToken) {
      console.error("UAZAPI_TOKEN not configured");
      return new Response(
        JSON.stringify({ success: false, error: "UAZAPI_TOKEN not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let requestBody: SendWhatsAppTextRequest;
    try {
      requestBody = await req.json();
      console.log("Request body received:", JSON.stringify(requestBody));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { phone, message } = requestBody;

    if (!phone || !message) {
      console.error("Missing phone or message");
      return new Response(
        JSON.stringify({ success: false, error: "Phone and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedPhone = formatPhoneForWhatsApp(phone);
    
    console.log(`Sending text message to: ${formattedPhone}`);
    console.log(`Message length: ${message.length} characters`);
    console.log(`Message preview: ${message.substring(0, 100)}...`);

    // Ensure URL doesn't have trailing slash
    const baseUrl = uazapiUrl.replace(/\/+$/, '');
    const endpoint = `${baseUrl}/message/text`;
    
    console.log(`Calling Uazapi endpoint: ${endpoint}`);

    const uazapiResponse = await fetch(endpoint, {
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

    console.log("Uazapi response status:", uazapiResponse.status);

    const responseText = await uazapiResponse.text();
    console.log("Uazapi response body:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!uazapiResponse.ok) {
      console.error("Uazapi API error:", responseData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to send WhatsApp message", 
          details: responseData,
          status: uazapiResponse.status
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("WhatsApp text message sent successfully!");

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
    console.error("Full error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
