// Uazapi - Check WhatsApp Connection Status
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  console.log("uazapi-status function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const uazapiUrl = Deno.env.get("UAZAPI_URL");
    const uazapiToken = Deno.env.get("UAZAPI_TOKEN");

    console.log("UAZAPI_URL configured:", !!uazapiUrl);
    console.log("UAZAPI_TOKEN configured:", !!uazapiToken);

    if (!uazapiUrl || !uazapiToken) {
      return new Response(
        JSON.stringify({ 
          connected: false, 
          error: "Uazapi não configurado" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Clean URL
    const baseUrl = uazapiUrl.replace(/\/$/, '');
    console.log("Checking Uazapi status at:", baseUrl);

    // Try the /instance/status endpoint
    const response = await fetch(`${baseUrl}/instance/status`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${uazapiToken}`,
      },
    });

    const responseText = await response.text();
    console.log("Uazapi response:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    // Parse the status response
    const isConnected = responseData?.status === 'CONNECTED' || 
                        responseData?.connected === true ||
                        responseData?.state === 'open' ||
                        responseData?.instance?.state === 'open' ||
                        responseText.toLowerCase().includes('connected');

    return new Response(
      JSON.stringify({
        connected: isConnected,
        phone: responseData?.phone || responseData?.instance?.phone || responseData?.wid?.user,
        name: responseData?.name || responseData?.instance?.name || responseData?.pushname,
        platform: 'WhatsApp',
        raw: responseData
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Error checking Uazapi status:", errorMessage);
    return new Response(
      JSON.stringify({ connected: false, error: errorMessage }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
