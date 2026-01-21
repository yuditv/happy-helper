// WhatsApp Instances Edge Function v5 - Fixed CORS
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] === WhatsApp Instances Function v5 ===`);
  console.log(`[${timestamp}] Method:`, req.method);
  console.log(`[${timestamp}] URL:`, req.url);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log(`[${timestamp}] Handling CORS preflight`);
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const uazapiUrl = Deno.env.get("UAZAPI_URL") || "https://zynk2.uazapi.com";
    const uazapiToken = Deno.env.get("UAZAPI_TOKEN") || "";

    console.log("Supabase URL:", supabaseUrl);
    console.log("UAZAPI URL:", uazapiUrl);
    console.log("UAZAPI Token exists:", !!uazapiToken);

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Parse URL path (for backwards compatibility)
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    let action = pathParts[1] || "";
    let entityId = pathParts[2] || "";

    console.log("Path action:", action);
    console.log("Path entity ID:", entityId);

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User ID:", user.id);

    // Parse request body
    let body: Record<string, unknown> = {};
    if (req.method !== "GET") {
      try {
        body = await req.json();
        console.log("Request body:", JSON.stringify(body));
        
        // Get action and entityId from body if provided (preferred method)
        if (body.action) {
          action = body.action as string;
        }
        if (body.instanceId) {
          entityId = body.instanceId as string;
        }
      } catch {
        console.log("No body or invalid JSON");
      }
    }

    console.log("Final action:", action);
    console.log("Final entity ID:", entityId);

    // Handle actions
    if (action === "create") {
      console.log("Creating instance...");
      
      const instanceName = (body.name as string) || `instance_${Date.now()}`;
      let instanceToken = `local_${Date.now()}`;
      let uazapiResult = null;

      // Try to create in UAZAPI
      if (uazapiToken) {
        try {
          console.log("Calling UAZAPI /instance/init...");
          const uazapiResponse = await fetch(`${uazapiUrl}/instance/init`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "admintoken": uazapiToken,
            },
            body: JSON.stringify({ name: instanceName }),
          });

          const responseText = await uazapiResponse.text();
          console.log("UAZAPI response status:", uazapiResponse.status);
          console.log("UAZAPI response:", responseText.substring(0, 500));

          if (uazapiResponse.ok) {
            try {
              uazapiResult = JSON.parse(responseText);
              instanceToken = uazapiResult.token || instanceToken;
              console.log("Instance token from UAZAPI:", instanceToken);
            } catch {
              console.log("Could not parse UAZAPI response as JSON");
            }
          }
        } catch (error) {
          console.error("UAZAPI error:", error);
        }
      } else {
        console.log("No UAZAPI token configured, skipping UAZAPI call");
      }

      // Save to database
      const { data: instance, error: dbError } = await supabase
        .from("whatsapp_instances")
        .insert({
          user_id: user.id,
          name: body.name || "Nova Instância",
          instance_key: instanceToken,
          daily_limit: (body.daily_limit as number) || 200,
          business_hours_start: (body.business_hours_start as string) || "08:00:00",
          business_hours_end: (body.business_hours_end as string) || "18:00:00",
          status: "disconnected",
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log("Instance created:", instance.id);
      
      return new Response(
        JSON.stringify({ success: true, instance, uazapi: uazapiResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "qrcode" && entityId) {
      console.log("Getting QR code for:", entityId);

      const { data: instance, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("id", entityId)
        .single();

      if (error || !instance) {
        return new Response(
          JSON.stringify({ error: "Instance not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const response = await fetch(`${uazapiUrl}/instance/connect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": instance.instance_key,
          },
          body: JSON.stringify({}),
        });

        const data = await response.json();
        const qrcode = data.instance?.qrcode || data.qrcode;

        if (qrcode) {
          await supabase
            .from("whatsapp_instances")
            .update({ qr_code: qrcode, status: "connecting" })
            .eq("id", entityId);
        }

        return new Response(
          JSON.stringify({ success: true, qrcode, data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("QR code error:", error);
        return new Response(
          JSON.stringify({ error: String(error) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "status" && entityId) {
      const { data: instance, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("id", entityId)
        .single();

      if (error || !instance) {
        return new Response(
          JSON.stringify({ error: "Instance not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const response = await fetch(`${uazapiUrl}/instance/status`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "token": instance.instance_key,
          },
        });

        const statusData = await response.json();
        const isConnected = statusData.status?.connected || statusData.instance?.status === "connected";
        const phone = statusData.status?.jid?.user || null;

        await supabase
          .from("whatsapp_instances")
          .update({
            status: isConnected ? "connected" : "disconnected",
            phone_connected: phone,
          })
          .eq("id", entityId);

        return new Response(
          JSON.stringify({ success: true, status: isConnected ? "connected" : "disconnected", phone, data: statusData }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: String(error) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "disconnect" && entityId) {
      const { data: instance, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("id", entityId)
        .single();

      if (error || !instance) {
        return new Response(
          JSON.stringify({ error: "Instance not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        await fetch(`${uazapiUrl}/instance/disconnect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "token": instance.instance_key },
        });
      } catch (e) {
        console.error("Disconnect error:", e);
      }

      await supabase
        .from("whatsapp_instances")
        .update({ status: "disconnected", phone_connected: null })
        .eq("id", entityId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete" && entityId) {
      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("id", entityId)
        .single();

      if (instance) {
        try {
          await fetch(`${uazapiUrl}/instance/disconnect`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "token": instance.instance_key },
          });
        } catch (e) {
          console.error("Delete disconnect error:", e);
        }
      }

      await supabase.from("whatsapp_instances").delete().eq("id", entityId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: list instances
    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
