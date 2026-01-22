// WhatsApp Instances Edge Function v7 - Schema Aligned
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] === WhatsApp Instances Function v7 ===`);
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
      
      // Save to database using correct column names from schema
      // Schema has: id, user_id, instance_name, status, last_connected_at, created_at, updated_at
      const { data: instance, error: dbError } = await supabase
        .from("whatsapp_instances")
        .insert({
          user_id: user.id,
          instance_name: instanceName,  // Correct column name
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
        JSON.stringify({ success: true, instance }),
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

      // For now, return a placeholder - UAZAPI integration would need instance_key column
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "QR code feature requires additional columns (instance_key). Please run a migration to add them.",
          instance 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

      return new Response(
        JSON.stringify({ success: true, status: instance.status, instance }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "disconnect" && entityId) {
      const { error } = await supabase
        .from("whatsapp_instances")
        .update({ status: "disconnected", last_connected_at: null })
        .eq("id", entityId);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete" && entityId) {
      const { error } = await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("id", entityId);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // List instances
    if (action === "list" || !action) {
      const { data: instances, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, instances }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
