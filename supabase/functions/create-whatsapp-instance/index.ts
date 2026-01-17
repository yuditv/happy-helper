// Evolution API WhatsApp Instance Creator - v4
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  console.log("=== CREATE WHATSAPP INSTANCE v4 ===");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evolutionApiUrl = "https://evo.iadespertardigital.shop";
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");

    console.log("API URL:", evolutionApiUrl);
    console.log("API Key exists:", !!evolutionApiKey);

    if (!evolutionApiKey) {
      return new Response(
        JSON.stringify({ error: "EVOLUTION_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const instanceName = body.instanceName;

    console.log("Instance name:", instanceName);

    if (!instanceName) {
      return new Response(
        JSON.stringify({ error: "instanceName is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Exactly matching Postman request
    const requestBody = {
      instanceName: instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    };

    console.log("Request body:", JSON.stringify(requestBody));

    const response = await fetch(`${evolutionApiUrl}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response status:", response.status);

    const responseText = await response.text();
    console.log("Response text:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Evolution API error", details: responseData }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
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
