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
      console.warn("Uazapi not configured - returning disconnected status");
      return new Response(
        JSON.stringify({ 
          connected: false, 
          error: "Uazapi não configurado" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Checking Uazapi status at:", uazapiUrl);

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      // Try different possible endpoints
      const endpoints = ['/instance/status', '/status', '/info'];
      let response: Response | null = null;
      let responseText = '';

      for (const endpoint of endpoints) {
        try {
          response = await fetch(`${uazapiUrl}${endpoint}`, {
            method: "GET",
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${uazapiToken}`,
            },
            signal: controller.signal,
          });
          
          if (response.ok) {
            responseText = await response.text();
            console.log(`Uazapi status response from ${endpoint}:`, responseText);
            break;
          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} failed, trying next...`);
          continue;
        }
      }

      clearTimeout(timeoutId);

      if (!response || !response.ok) {
        console.warn("All Uazapi endpoints failed");
        return new Response(
          JSON.stringify({ 
            connected: false, 
            error: "Não foi possível verificar status" 
          } as UazapiStatusResponse),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
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
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn("Uazapi status check timed out");
        return new Response(
          JSON.stringify({ connected: false, error: "Timeout na verificação" } as UazapiStatusResponse),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      throw fetchError;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Error checking Uazapi status:", errorMessage);
    return new Response(
      JSON.stringify({ connected: false, error: errorMessage } as UazapiStatusResponse),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
