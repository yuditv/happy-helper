import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  console.log("=== TEST EVOLUTION CONNECTION STARTED ===");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");

    const result = {
      timestamp: new Date().toISOString(),
      secrets: {
        EVOLUTION_API_URL: {
          exists: !!evolutionApiUrl,
          value: evolutionApiUrl ? `${evolutionApiUrl.substring(0, 30)}...` : "NOT SET",
          length: evolutionApiUrl?.length || 0,
        },
        EVOLUTION_API_KEY: {
          exists: !!evolutionApiKey,
          length: evolutionApiKey?.length || 0,
          firstChars: evolutionApiKey ? `${evolutionApiKey.substring(0, 8)}...` : "NOT SET",
        },
      },
      apiTest: null as any,
    };

    if (evolutionApiUrl && evolutionApiKey) {
      console.log("Testing connection to Evolution API...");
      console.log("URL:", evolutionApiUrl);
      
      try {
        // Test fetching all instances (simple GET request)
        const testUrl = `${evolutionApiUrl}/instance/fetchInstances`;
        console.log("Test URL:", testUrl);

        const response = await fetch(testUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": evolutionApiKey,
          },
        });

        console.log("Response status:", response.status);
        const responseText = await response.text();
        console.log("Response body:", responseText);

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }

        result.apiTest = {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          response: responseData,
        };
      } catch (fetchError: any) {
        console.error("Fetch error:", fetchError);
        result.apiTest = {
          success: false,
          error: fetchError.message,
          type: "FETCH_ERROR",
        };
      }
    } else {
      result.apiTest = {
        success: false,
        error: "Missing API URL or API Key",
        type: "MISSING_CONFIG",
      };
    }

    console.log("Test result:", JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in test-evolution-connection:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        stack: error.stack,
        type: "FUNCTION_ERROR"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
