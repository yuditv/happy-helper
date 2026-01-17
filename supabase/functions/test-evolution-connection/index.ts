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
          value: evolutionApiUrl || "NOT SET",
        },
        EVOLUTION_API_KEY: {
          exists: !!evolutionApiKey,
          length: evolutionApiKey?.length || 0,
          value: evolutionApiKey ? `${evolutionApiKey.substring(0, 10)}...` : "NOT SET",
        },
      },
      tests: {} as any,
    };

    if (evolutionApiUrl && evolutionApiKey) {
      console.log("Testing connection to Evolution API...");
      console.log("Base URL:", evolutionApiUrl);
      console.log("API Key:", evolutionApiKey);
      
      // Test 1: Fetch all instances
      try {
        const fetchUrl = `${evolutionApiUrl}/instance/fetchInstances`;
        console.log("Test 1 - Fetching instances:", fetchUrl);

        const fetchResponse = await fetch(fetchUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": evolutionApiKey,
          },
        });

        const fetchText = await fetchResponse.text();
        console.log("Fetch response:", fetchResponse.status, fetchText);

        result.tests.fetchInstances = {
          success: fetchResponse.ok,
          status: fetchResponse.status,
          response: fetchText.length > 500 ? fetchText.substring(0, 500) + "..." : fetchText,
        };
      } catch (e: any) {
        result.tests.fetchInstances = { success: false, error: e.message };
      }

      // Test 2: Create a test instance
      try {
        const createUrl = `${evolutionApiUrl}/instance/create`;
        const testInstanceName = `test-${Date.now()}`;
        console.log("Test 2 - Creating instance:", createUrl, testInstanceName);

        const createResponse = await fetch(createUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": evolutionApiKey,
          },
          body: JSON.stringify({
            instanceName: testInstanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
          }),
        });

        const createText = await createResponse.text();
        console.log("Create response:", createResponse.status, createText);

        result.tests.createInstance = {
          success: createResponse.ok,
          status: createResponse.status,
          instanceName: testInstanceName,
          response: createText.length > 1000 ? createText.substring(0, 1000) + "..." : createText,
        };
      } catch (e: any) {
        result.tests.createInstance = { success: false, error: e.message };
      }
    } else {
      result.tests = {
        error: "Missing API URL or API Key",
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
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
