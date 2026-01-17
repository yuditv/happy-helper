// Edge function to create WhatsApp instance via Evolution API
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateInstanceRequest {
  instanceName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error("Missing Evolution API configuration");
      return new Response(
        JSON.stringify({ 
          error: "Evolution API not configured. Please set EVOLUTION_API_URL and EVOLUTION_API_KEY secrets." 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { instanceName }: CreateInstanceRequest = await req.json();

    if (!instanceName) {
      return new Response(
        JSON.stringify({ error: "Instance name is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Creating WhatsApp instance: ${instanceName}`);

    // Evolution API endpoint for creating instance
    const apiUrl = `${evolutionApiUrl}/instance/create`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Evolution API error:", responseData);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create WhatsApp instance", 
          details: responseData 
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("WhatsApp instance created successfully:", responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "WhatsApp instance created successfully",
        data: responseData 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-whatsapp-instance function:", error);
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
