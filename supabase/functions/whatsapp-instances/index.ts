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
        
        // First, try to initiate connection mode with paircode flag
        console.log("Initiating connection mode with paircode...");
        const connectResponse = await fetch(`${uazapiUrl}/instance/connect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": instance.instance_key,
          },
          body: JSON.stringify({ 
            paircode: true,
            number: cleanPhone
          }),
        });
        
        console.log("Connect with paircode response status:", connectResponse.status);
        
        if (connectResponse.ok) {
          const connectData = await connectResponse.json();
          console.log("Connect with paircode response:", JSON.stringify(connectData));
          
          // Check if paircode is in the response
          const code = connectData.paircode || connectData.instance?.paircode || connectData.code;
          if (code) {
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

        // Fallback: Try GET /instance/paircode/{phone} path format
        console.log("Trying GET /instance/paircode/{phone}...");
        const pairResponsePath = await fetch(`${uazapiUrl}/instance/paircode/${cleanPhone}`, {
          method: "GET",
          headers: {
            "token": instance.instance_key,
          },
        });

        console.log("Paircode path GET response status:", pairResponsePath.status);
        
        if (pairResponsePath.ok) {
          const pairData = await pairResponsePath.json();
          console.log("Paircode path GET response:", JSON.stringify(pairData));
          
          const code = pairData.paircode || pairData.code || pairData.instance?.paircode || pairData.pair_code;
          if (code) {
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

        // Fallback 2: Try query parameter format
        console.log("Trying GET /instance/paircode?number=...");
        const pairResponseQuery = await fetch(`${uazapiUrl}/instance/paircode?number=${cleanPhone}`, {
          method: "GET",
          headers: {
            "token": instance.instance_key,
          },
        });

        console.log("Paircode query GET response status:", pairResponseQuery.status);
        
        if (pairResponseQuery.ok) {
          const pairData = await pairResponseQuery.json();
          console.log("Paircode query GET response:", JSON.stringify(pairData));
          
          const code = pairData.paircode || pairData.code || pairData.instance?.paircode || pairData.pair_code;
          if (code) {
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

        // If all methods fail, check current instance status for any available paircode
        console.log("Checking instance status for paircode...");
        const statusResponse = await fetch(`${uazapiUrl}/instance/status`, {
          headers: { "token": instance.instance_key },
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log("Status check for paircode:", JSON.stringify(statusData));
          
          const code = statusData.paircode || statusData.instance?.paircode;
          if (code) {
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

        // If all fail, return error suggesting QR Code
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Código de pareamento não disponível para esta API. A UAZAPI pode não suportar este método.",
            hint: "Use o QR Code para conectar. O código de pareamento pode não estar disponível nesta versão da API."
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("UAZAPI paircode error:", e);
        return new Response(
          JSON.stringify({ error: "Erro ao comunicar com UAZAPI", details: String(e) }),
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
            console.log("Status data from UAZAPI:", JSON.stringify(statusData));
            
            // Determine connection status from multiple indicators
            // UAZAPI returns: { instance: { status, owner, profileName }, status: { connected, loggedIn } }
            const isConnected = 
              statusData.status?.connected === true ||   // Direct flag
              statusData.status?.loggedIn === true ||    // Logged in flag
              (statusData.instance?.owner && statusData.instance?.profileName); // Has profile = connected
            
            // Map UAZAPI status to our status
            let newStatus = "disconnected";
            if (isConnected) {
              newStatus = "connected";
            } else if (statusData.instance?.status === "connecting" || statusData.instance?.qrcode) {
              newStatus = "connecting";
            }
            
            // Extract phone from owner field (format: 559180910280)
            const phoneConnected = statusData.instance?.owner || statusData.phone || null;
            const profileName = statusData.instance?.profileName || null;
            
            console.log("Mapped status:", newStatus, "Phone:", phoneConnected, "Profile:", profileName);
            
            // Update DB if status changed
            if (newStatus !== instance.status || phoneConnected !== instance.phone_connected) {
              await supabase
                .from("whatsapp_instances")
                .update({ 
                  status: newStatus,
                  phone_connected: phoneConnected,
                  last_connected_at: newStatus === "connected" ? new Date().toISOString() : instance.last_connected_at
                })
                .eq("id", entityId);
            }

            // Configure webhook when instance becomes connected
            if (isConnected && instance.status !== "connected") {
              const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-inbox-webhook`;
              console.log("Configuring webhook URL in UAZAPI:", webhookUrl);
              
              try {
                const webhookResponse = await fetch(`${uazapiUrl}/webhook`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "token": instance.instance_key,
                  },
                  body: JSON.stringify({
                    webhookURL: webhookUrl,
                    events: ["messages", "status", "qrcode"]
                  }),
                });
                
                if (webhookResponse.ok) {
                  console.log("Webhook configured successfully in UAZAPI");
                } else {
                  const webhookError = await webhookResponse.text();
                  console.error("Failed to configure webhook:", webhookError);
                }
              } catch (webhookErr) {
                console.error("Error configuring webhook:", webhookErr);
              }
            }

            return new Response(
              JSON.stringify({ 
                success: true, 
                status: newStatus, 
                phone: phoneConnected,
                profileName: profileName 
              }),
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

    // CONFIGURE-WEBHOOK - Manually configure webhook for an instance
    if (action === "configure-webhook" && entityId) {
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
          JSON.stringify({ error: "Instância não inicializada. Conecte a instância primeiro." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-inbox-webhook`;
      console.log("Configuring webhook URL in UAZAPI:", webhookUrl);

      try {
        const webhookResponse = await fetch(`${uazapiUrl}/webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": instance.instance_key,
          },
          body: JSON.stringify({
            webhookURL: webhookUrl,
            events: ["messages", "status", "qrcode"]
          }),
        });

        const webhookData = await webhookResponse.json().catch(() => null);
        console.log("Webhook response:", webhookResponse.status, JSON.stringify(webhookData));

        if (webhookResponse.ok) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              webhookUrl,
              configured: true,
              message: "Webhook configurado com sucesso!"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Falha ao configurar webhook na UAZAPI",
              details: webhookData
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (webhookErr) {
        console.error("Error configuring webhook:", webhookErr);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Erro ao comunicar com UAZAPI",
            details: String(webhookErr)
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
