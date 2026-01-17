import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  console.log("=== GET WHATSAPP INSTANCE STATUS FUNCTION STARTED ===");
  console.log("Request method:", req.method);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");

    console.log("EVOLUTION_API_URL exists:", !!evolutionApiUrl);
    console.log("EVOLUTION_API_KEY exists:", !!evolutionApiKey);

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

    const requestBody = await req.text();
    console.log("Raw request body:", requestBody);

    let instanceName: string;
    try {
      const parsed = JSON.parse(requestBody);
      instanceName = parsed.instanceName;
      console.log("Parsed instanceName:", instanceName);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!instanceName) {
      console.error("Instance name is missing");
      return new Response(
        JSON.stringify({ error: "Instance name is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Getting WhatsApp instance status: ${instanceName}`);

    const apiUrl = `${evolutionApiUrl}/instance/connectionState/${instanceName}`;
    console.log("Calling Evolution API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey,
      },
    });

    console.log("Evolution API response status:", response.status);

    const responseText = await response.text();
    console.log("Evolution API raw response:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse Evolution API response as JSON");
      responseData = { rawResponse: responseText };
    }

    if (!response.ok) {
      console.error("Evolution API error:", responseData);
      return new Response(
        JSON.stringify({ 
          error: "Failed to get WhatsApp instance status", 
          details: responseData 
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("WhatsApp instance status retrieved successfully:", responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: responseData 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in get-whatsapp-instance function:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
