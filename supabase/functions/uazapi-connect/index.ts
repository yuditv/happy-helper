// Uazapi - Connect WhatsApp Instance
// Version: 2 - Force redeploy
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  console.log("=== UAZAPI CONNECT INSTANCE ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const uazapiUrl = "https://yudipro.uazapi.com";
    const uazapiToken = Deno.env.get("UAZAPI_TOKEN");

    console.log("API URL:", uazapiUrl);
    console.log("Token exists:", !!uazapiToken);

    if (!uazapiToken) {
      return new Response(
        JSON.stringify({ error: "UAZAPI_TOKEN not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const { phone } = body;

    console.log("Phone (optional):", phone);

    // Call Uazapi connect endpoint
    // If phone is provided, generates pairing code. If not, generates QR code.
    const requestBody: any = {};
    if (phone) {
      requestBody.phone = phone;
    }

    console.log("Request body:", JSON.stringify(requestBody));

    const response = await fetch(`${uazapiUrl}/instance/connect`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${uazapiToken}`,
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
        JSON.stringify({ error: "Uazapi API error", details: responseData }),
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
