// Uazapi - Check WhatsApp Connection Status
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UazapiStatusResponse {
  connected: boolean;
  phone?: string;
  name?: string;
  platform?: string;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const uazapiUrl = Deno.env.get("UAZAPI_URL");
    const uazapiToken = Deno.env.get("UAZAPI_TOKEN");

    if (!uazapiUrl || !uazapiToken) {
      console.error("Missing Uazapi configuration");
      return new Response(
        JSON.stringify({ 
          connected: false, 
          error: "UAZAPI_URL or UAZAPI_TOKEN not configured" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Checking Uazapi status...");

    // Uazapi status endpoint
    const response = await fetch(`${uazapiUrl}/instance/status`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${uazapiToken}`,
      },
    });

    const responseText = await response.text();
    console.log("Uazapi status response:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error("Uazapi status error:", responseData);
      return new Response(
        JSON.stringify({ 
          connected: false, 
          error: "Failed to get status" 
        } as UazapiStatusResponse),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse the status response - adapt based on actual Uazapi response format
    const isConnected = responseData?.status === 'CONNECTED' || 
                        responseData?.connected === true ||
                        responseData?.state === 'open' ||
                        responseData?.instance?.state === 'open';

    const result: UazapiStatusResponse = {
      connected: isConnected,
      phone: responseData?.phone || responseData?.instance?.phone || responseData?.wid?.user,
      name: responseData?.name || responseData?.instance?.name || responseData?.pushname,
      platform: responseData?.platform || 'WhatsApp',
    };

    console.log("Parsed status:", result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error checking Uazapi status:", errorMessage);
    return new Response(
      JSON.stringify({ connected: false, error: errorMessage } as UazapiStatusResponse),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
