// Uazapi - Get Instance Status
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  console.log("=== UAZAPI GET INSTANCE STATUS ===");

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

    // Call Uazapi status endpoint
    const response = await fetch(`${uazapiUrl}/instance/status`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${uazapiToken}`,
      },
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
