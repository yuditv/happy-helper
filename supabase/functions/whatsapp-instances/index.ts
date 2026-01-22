// WhatsApp Instances Edge Function v9 - Init on Create
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] === WhatsApp Instances Function v9 ===`);
  console.log(`[${timestamp}] Method:`, req.method);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const uazapiUrl = Deno.env.get("UAZAPI_URL") || "https://zynk2.uazapi.com";
    const uazapiAdminToken = Deno.env.get("UAZAPI_TOKEN") || "";

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User ID:", user.id);

    // Parse request
    let action = "";
    let entityId = "";
    let body: Record<string, unknown> = {};

    if (req.method !== "GET") {
      try {
        body = await req.json();
        action = (body.action as string) || "";
        entityId = (body.instanceId as string) || "";
      } catch {
        console.log("No body or invalid JSON");
      }
    }

    console.log("Action:", action, "Entity:", entityId);

    // CREATE - Initialize in UAZAPI immediately
    if (action === "create") {
      const instanceName = (body.name as string) || `instance_${Date.now()}`;
      const dailyLimit = (body.dailyLimit as number) || 200;

      let instanceKey: string | null = null;

      // Initialize in UAZAPI first (uses admintoken header)
      if (uazapiAdminToken) {
        try {
          console.log("Initializing instance in UAZAPI:", instanceName);
          console.log("UAZAPI URL:", uazapiUrl);
          
          const initResponse = await fetch(`${uazapiUrl}/instance/init`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "admintoken": uazapiAdminToken,
            },
            body: JSON.stringify({ 
              name: instanceName,
              token: crypto.randomUUID() // Generate a unique token for this instance
            }),
          });

          console.log("UAZAPI init response status:", initResponse.status);
          const initData = await initResponse.json();
          console.log("UAZAPI init response:", JSON.stringify(initData));

          if (initResponse.ok && initData) {
            instanceKey = initData.token || initData.key || initData.instance_key || null;
            console.log("Instance key obtained:", instanceKey ? "yes" : "no");
          } else {
            console.error("UAZAPI init failed:", initData);
          }
        } catch (e) {
          console.error("UAZAPI init error:", e);
        }
      } else {
        console.log("UAZAPI_TOKEN not configured");
      }

      // Insert in database with instance_key if obtained
      const { data: instance, error: dbError } = await supabase
        .from("whatsapp_instances")
        .insert({
          user_id: user.id,
          instance_name: instanceName,
          status: "disconnected",
          daily_limit: dailyLimit,
          instance_key: instanceKey,
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log("Instance created in DB:", instance.id, "with UAZAPI key:", !!instanceKey);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          instance,
          uazapiInitialized: !!instanceKey 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // QRCODE - with UAZAPI integration
    if (action === "qrcode" && entityId) {
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

      // If no instance_key, we need to init the instance first via UAZAPI
      if (!instance.instance_key && uazapiAdminToken) {
        try {
          console.log("Initializing instance via UAZAPI (late init)...");
          const initResponse = await fetch(`${uazapiUrl}/instance/init`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "admintoken": uazapiAdminToken,
            },
            body: JSON.stringify({ 
              name: instance.instance_name,
              token: crypto.randomUUID()
            }),
          });

          if (initResponse.ok) {
            const initData = await initResponse.json();
            console.log("UAZAPI init response:", initData);

            const newInstanceKey = initData.token || initData.key || initData.instance_key;
            if (newInstanceKey) {
              await supabase
                .from("whatsapp_instances")
                .update({ instance_key: newInstanceKey })
                .eq("id", entityId);
              
              // Update local reference for QR code fetch
              instance.instance_key = newInstanceKey;
            }
          }
        } catch (e) {
          console.error("UAZAPI init error:", e);
        }
      }

      // Fetch fresh instance data
      const { data: updatedInstance } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("id", entityId)
        .single();

      // Get QR code from UAZAPI if we have instance_key
      const activeInstanceKey = instance.instance_key || updatedInstance?.instance_key;
      if (activeInstanceKey) {
        try {
          console.log("Fetching QR code for instance key...");
          const qrResponse = await fetch(`${uazapiUrl}/instance/qrcode`, {
            method: "GET",
            headers: {
              "token": activeInstanceKey,
            },
          });

          if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            console.log("QR code received");

            // Save QR code to DB
            if (qrData.qrcode || qrData.qr) {
              const qrCode = qrData.qrcode || qrData.qr;
              await supabase
                .from("whatsapp_instances")
                .update({ qr_code: qrCode })
                .eq("id", entityId);

              return new Response(
                JSON.stringify({ success: true, qrcode: qrCode }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        } catch (e) {
          console.error("UAZAPI QR error:", e);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Could not retrieve QR code. Check UAZAPI configuration.",
          instance: updatedInstance 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STATUS - check instance status
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

      // Check UAZAPI status if we have instance_key
      if (instance.instance_key) {
        try {
          const statusResponse = await fetch(`${uazapiUrl}/instance/status`, {
            headers: { "token": instance.instance_key },
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const newStatus = statusData.connected ? "connected" : "disconnected";
            
            // Update DB if status changed
            if (newStatus !== instance.status) {
              await supabase
                .from("whatsapp_instances")
                .update({ 
                  status: newStatus,
                  phone_connected: statusData.phone || null,
                  last_connected_at: newStatus === "connected" ? new Date().toISOString() : null
                })
                .eq("id", entityId);
            }

            return new Response(
              JSON.stringify({ success: true, status: newStatus, phone: statusData.phone }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (e) {
          console.error("UAZAPI status error:", e);
        }
      }

      return new Response(
        JSON.stringify({ success: true, status: instance.status, instance }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DISCONNECT
    if (action === "disconnect" && entityId) {
      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("instance_key")
        .eq("id", entityId)
        .single();

      // Disconnect from UAZAPI if we have instance_key
      if (instance?.instance_key) {
        try {
          await fetch(`${uazapiUrl}/instance/logout`, {
            method: "POST",
            headers: { "token": instance.instance_key },
          });
        } catch (e) {
          console.error("UAZAPI disconnect error:", e);
        }
      }

      const { error } = await supabase
        .from("whatsapp_instances")
        .update({ status: "disconnected", last_connected_at: null, qr_code: null })
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

    // DELETE
    if (action === "delete" && entityId) {
      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("instance_key")
        .eq("id", entityId)
        .single();

      // Delete from UAZAPI if we have instance_key
      if (instance?.instance_key) {
        try {
          await fetch(`${uazapiUrl}/instance/delete`, {
            method: "DELETE",
            headers: { "token": instance.instance_key },
          });
        } catch (e) {
          console.error("UAZAPI delete error:", e);
        }
      }

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

    // LIST instances
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
