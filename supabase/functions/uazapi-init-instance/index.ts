// Uazapi - Create/Init WhatsApp Instance
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InitInstanceRequest {
  name: string;
  systemName?: string;
  adminField01?: string;
  adminField02?: string;
  fingerprintProfile?: string;
  browser?: string;
}

serve(async (req: Request): Promise<Response> => {
  console.log("=== UAZAPI INIT INSTANCE ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const uazapiUrl = "https://yudipro.uazapi.com";
    const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");

    console.log("API URL:", uazapiUrl);
    console.log("Admin Token exists:", !!adminToken);

    if (!adminToken) {
      return new Response(
        JSON.stringify({ error: "UAZAPI_ADMIN_TOKEN not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: InitInstanceRequest = await req.json();
    
    if (!body.name) {
      return new Response(
        JSON.stringify({ error: "Instance name is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Creating instance:", body.name);

    const requestBody = {
      name: body.name,
      systemName: body.systemName || "lovable-app",
      adminField01: body.adminField01 || "",
      adminField02: body.adminField02 || "",
      fingerprintProfile: body.fingerprintProfile || "chrome",
      browser: body.browser || "chrome",
    };

    console.log("Request body:", JSON.stringify(requestBody));

    const response = await fetch(`${uazapiUrl}/instance/init`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
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

    // Return success with instance data including the token
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: responseData,
        message: "Instance created successfully. Save the token for future operations."
      }),
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
