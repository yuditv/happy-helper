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

    // QRCODE - POST /instance/connect + GET /instance/status
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

      const activeInstanceKey = instance.instance_key || updatedInstance?.instance_key;
      if (activeInstanceKey) {
        try {
          // Step 1: POST /instance/connect to initiate connection and get QR code
          console.log("Calling POST /instance/connect to get QR code...");
          const connectResponse = await fetch(`${uazapiUrl}/instance/connect`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "token": activeInstanceKey,
            },
          });

          console.log("Connect response status:", connectResponse.status);
          
          if (connectResponse.ok) {
            const connectData = await connectResponse.json();
            console.log("Connect response:", JSON.stringify(connectData));

            // QR code is in instance.qrcode field
            const qrCode = connectData.instance?.qrcode;
            if (qrCode) {
              await supabase
                .from("whatsapp_instances")
                .update({ qr_code: qrCode, status: "connecting" })
                .eq("id", entityId);

              return new Response(
                JSON.stringify({ success: true, qrcode: qrCode }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }

          // Step 2: Fallback - GET /instance/status to get updated QR code
          console.log("Fetching GET /instance/status for QR code...");
          const statusResponse = await fetch(`${uazapiUrl}/instance/status`, {
            headers: { "token": activeInstanceKey },
          });

          console.log("Status response status:", statusResponse.status);

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log("Status response:", JSON.stringify(statusData));

            const qrCode = statusData.instance?.qrcode;
            if (qrCode) {
              await supabase
                .from("whatsapp_instances")
                .update({ qr_code: qrCode, status: "connecting" })
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

    // PAIRCODE - Connect via pairing code
    if (action === "paircode" && entityId) {
      const phoneNumber = body.phoneNumber as string;
      
      if (!phoneNumber) {
        return new Response(
          JSON.stringify({ error: "Número de telefone obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

      if (!instance.instance_key) {
        return new Response(
          JSON.stringify({ error: "Instância não inicializada. Tente gerar o QR Code primeiro." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        // Clean phone number - remove non-digits
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        console.log("Requesting pairing code for phone:", cleanPhone);
        
        // First, try to initiate connection mode
        console.log("Initiating connection mode before paircode...");
        const connectResponse = await fetch(`${uazapiUrl}/instance/connect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": instance.instance_key,
          },
        });
        console.log("Connect response status:", connectResponse.status);
        
        // Now request the pairing code - try GET method first (some APIs use GET for this)
        console.log("Requesting paircode via GET...");
        const pairResponseGet = await fetch(`${uazapiUrl}/instance/paircode?number=${cleanPhone}`, {
          method: "GET",
          headers: {
            "token": instance.instance_key,
          },
        });

        console.log("Paircode GET response status:", pairResponseGet.status);
        
        if (pairResponseGet.ok) {
          const pairData = await pairResponseGet.json();
          console.log("Paircode GET response:", JSON.stringify(pairData));
          
          if (pairData.paircode || pairData.code || pairData.instance?.paircode) {
            const code = pairData.paircode || pairData.code || pairData.instance?.paircode;
            
            await supabase
              .from("whatsapp_instances")
              .update({ status: "connecting" })
              .eq("id", entityId);

            return new Response(
              JSON.stringify({ success: true, paircode: code }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Fallback: try POST with phone in body
        console.log("Trying POST method for paircode...");
        const pairResponsePost = await fetch(`${uazapiUrl}/instance/paircode`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": instance.instance_key,
          },
          body: JSON.stringify({ 
            number: cleanPhone,
            phone: cleanPhone 
          }),
        });

        console.log("Paircode POST response status:", pairResponsePost.status);
        const pairDataPost = await pairResponsePost.json();
        console.log("Paircode POST response:", JSON.stringify(pairDataPost));

        if (pairResponsePost.ok && (pairDataPost.paircode || pairDataPost.code || pairDataPost.instance?.paircode)) {
          const code = pairDataPost.paircode || pairDataPost.code || pairDataPost.instance?.paircode;
          
          await supabase
            .from("whatsapp_instances")
            .update({ status: "connecting" })
            .eq("id", entityId);

          return new Response(
            JSON.stringify({ success: true, paircode: code }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // If both fail, return error with details
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: pairDataPost.error || pairDataPost.message || "Código de pareamento não disponível. Certifique-se de que a instância está em modo de conexão (QR Code gerado).",
            hint: "Tente escanear o QR Code no lugar do código de pareamento"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("UAZAPI paircode error:", e);
        return new Response(
          JSON.stringify({ error: "Erro ao comunicar com UAZAPI" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
        .select("instance_key, instance_name")
        .eq("id", entityId)
        .single();

      console.log("Deleting instance:", entityId, "name:", instance?.instance_name, "key:", instance?.instance_key ? "exists" : "none");

      // Delete from UAZAPI - uses DELETE /instance with instance token
      if (instance?.instance_key) {
        try {
          console.log("Calling UAZAPI delete for instance with key:", instance.instance_key);
          const deleteResponse = await fetch(`${uazapiUrl}/instance`, {
            method: "DELETE",
            headers: { 
              "token": instance.instance_key 
            },
          });
          
          console.log("UAZAPI delete response status:", deleteResponse.status);
          const deleteData = await deleteResponse.json();
          console.log("UAZAPI delete response:", JSON.stringify(deleteData));
        } catch (e) {
          console.error("UAZAPI delete error:", e);
        }
      } else {
        console.log("Skipping UAZAPI delete - no instance key");
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

    // CHECK-NUMBER - Verify if numbers have WhatsApp
    if (action === "check-number" && entityId) {
      const phones = body.phones as string[];
      const fetchName = body.fetchName as boolean ?? false;
      
      if (!phones || !Array.isArray(phones) || phones.length === 0) {
        return new Response(
          JSON.stringify({ error: "Lista de telefones é obrigatória" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

      if (!instance.instance_key) {
        return new Response(
          JSON.stringify({ error: "Instância não inicializada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (instance.status !== "connected") {
        return new Response(
          JSON.stringify({ error: "Instância não está conectada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      
      for (const phone of phones) {
        try {
          // Format phone number
          let formattedPhone = phone.replace(/[^\d]/g, '');
          if (!formattedPhone.startsWith('55') && formattedPhone.length <= 11) {
            formattedPhone = '55' + formattedPhone;
          }

          console.log(`Checking number: ${formattedPhone}`);
          
          // Call UAZAPI checkNumber endpoint
          const checkResponse = await fetch(`${uazapiUrl}/chat/checkNumber`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "token": instance.instance_key,
            },
            body: JSON.stringify({ 
              number: formattedPhone 
            }),
          });

          const checkData = await checkResponse.json();
          console.log(`Check result for ${formattedPhone}:`, JSON.stringify(checkData));

          const exists = checkData.exists === true || checkData.isRegistered === true || checkData.numberExists === true;
          
          results.push({
            phone: formattedPhone,
            exists,
            whatsappName: fetchName && exists ? (checkData.name || checkData.pushName || checkData.verifiedName || null) : null,
          });

          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.error(`Error checking ${phone}:`, e);
          results.push({
            phone,
            exists: false,
            error: String(e),
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
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
