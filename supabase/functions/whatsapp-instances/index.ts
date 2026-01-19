import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// UAZAPI Service - Based on official API spec
class UazapiService {
  private baseUrl: string;
  private adminToken: string;

  constructor() {
    this.baseUrl = Deno.env.get("UAZAPI_URL") || "https://zynk2.uazapi.com";
    this.adminToken = Deno.env.get("UAZAPI_TOKEN") || "";
    console.log("UAZAPI configured:", { baseUrl: this.baseUrl, hasToken: !!this.adminToken });
  }

  // Admin request - uses admintoken header
  private async adminRequest(endpoint: string, method: string = "GET", body?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`UAZAPI Admin Request: ${method} ${url}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "admintoken": this.adminToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    console.log(`UAZAPI Response (${response.status}):`, text.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `UAZAPI Error: ${response.status}`);
    }

    return data;
  }

  // Instance request - uses token header (instance token)
  private async instanceRequest(instanceToken: string, endpoint: string, method: string = "GET", body?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`UAZAPI Instance Request: ${method} ${url}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    console.log(`UAZAPI Response (${response.status}):`, text.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `UAZAPI Error: ${response.status}`);
    }

    return data;
  }

  // Create instance using admin token - POST /instance/init
  async createInstance(name: string) {
    return this.adminRequest("/instance/init", "POST", { name });
  }

  // Connect instance and get QR code - POST /instance/connect
  async connect(instanceToken: string, phone?: string) {
    const body = phone ? { phone } : {};
    return this.instanceRequest(instanceToken, "/instance/connect", "POST", body);
  }

  // Get instance status - GET /instance/status
  async getStatus(instanceToken: string) {
    return this.instanceRequest(instanceToken, "/instance/status", "GET");
  }

  // Disconnect instance - POST /instance/disconnect
  async disconnect(instanceToken: string) {
    return this.instanceRequest(instanceToken, "/instance/disconnect", "POST");
  }

  // Send text message - POST /message/sendText
  async sendText(instanceToken: string, phone: string, message: string) {
    return this.instanceRequest(instanceToken, "/message/sendText", "POST", {
      number: this.formatPhone(phone),
      text: message,
    });
  }

  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, "");
    if (!cleaned.startsWith("55")) {
      cleaned = "55" + cleaned;
    }
    return cleaned;
  }
}

const uazapi = new UazapiService();

serve(async (req: Request): Promise<Response> => {
  console.log("Request received:", req.method, req.url);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    console.log("Path parts:", pathParts);
    
    // pathParts[0] = 'whatsapp-instances' (function name)
    // pathParts[1] = action (create, qrcode, status, etc)
    // pathParts[2] = id (optional)
    const action = pathParts[1] || pathParts[0];
    const entityId = pathParts[2] || pathParts[1];
    
    console.log("Action:", action, "Entity ID:", entityId);

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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

    console.log("User authenticated:", user.id);

    let body: any = {};
    if (req.method !== "GET") {
      try {
        body = await req.json();
        console.log("Request body:", body);
      } catch {
        console.log("No body or invalid JSON");
      }
    }

    switch (action) {
      case "create": {
        console.log("Creating instance...");
        const instanceName = body.name || `instance_${Date.now()}`;
        
        let uazapiResult: any = null;
        let instanceToken = null;
        
        try {
          // Create instance in UAZAPI - returns token
          uazapiResult = await uazapi.createInstance(instanceName);
          instanceToken = uazapiResult.token;
          console.log("UAZAPI create result:", uazapiResult);
        } catch (error: any) {
          console.error("UAZAPI create error:", error.message);
          // Don't fail - we'll save without UAZAPI token
        }

        // Save to database
        const { data: instance, error } = await supabase
          .from("whatsapp_instances")
          .insert({
            user_id: user.id,
            name: body.name || "Nova Instância",
            instance_key: instanceToken || `local_${Date.now()}`,
            daily_limit: body.daily_limit || 200,
            business_hours_start: body.business_hours_start || "08:00:00",
            business_hours_end: body.business_hours_end || "18:00:00",
            status: "disconnected",
          })
          .select()
          .single();

        if (error) {
          console.error("DB insert error:", error);
          throw error;
        }

        console.log("Instance created:", instance);
        return new Response(
          JSON.stringify({ success: true, instance, uazapi: uazapiResult }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "qrcode": {
        const instanceId = entityId;
        console.log("Getting QR code for instance:", instanceId);
        
        // Get instance from DB
        const { data: instance, error } = await supabase
          .from("whatsapp_instances")
          .select("*")
          .eq("id", instanceId)
          .single();

        if (error || !instance) {
          console.error("Instance not found:", error);
          return new Response(
            JSON.stringify({ error: "Instance not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        try {
          // Call /instance/connect to get QR code
          const connectResult = await uazapi.connect(instance.instance_key);
          
          // The QR code is in the instance object returned
          const qrcode = connectResult.instance?.qrcode || connectResult.qrcode;
          
          if (qrcode) {
            // Update instance with QR code
            await supabase
              .from("whatsapp_instances")
              .update({ qr_code: qrcode, status: "connecting" })
              .eq("id", instanceId);
          }

          return new Response(
            JSON.stringify({ success: true, qrcode, data: connectResult }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (error: any) {
          console.error("QR code error:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "status": {
        const instanceId = entityId;
        console.log("Checking status for instance:", instanceId);
        
        const { data: instance, error } = await supabase
          .from("whatsapp_instances")
          .select("*")
          .eq("id", instanceId)
          .single();

        if (error || !instance) {
          return new Response(
            JSON.stringify({ error: "Instance not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        try {
          const statusData = await uazapi.getStatus(instance.instance_key);
          
          // Parse status from response
          const isConnected = statusData.status?.connected || 
                             statusData.instance?.status === "connected";
          const phone = statusData.status?.jid?.user || null;
          
          // Update instance status
          await supabase
            .from("whatsapp_instances")
            .update({ 
              status: isConnected ? "connected" : "disconnected",
              phone_connected: phone,
            })
            .eq("id", instanceId);

          return new Response(
            JSON.stringify({ 
              success: true, 
              status: isConnected ? "connected" : "disconnected",
              phone,
              data: statusData,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (error: any) {
          console.error("Status check error:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "disconnect": {
        const instanceId = entityId;
        
        const { data: instance, error } = await supabase
          .from("whatsapp_instances")
          .select("*")
          .eq("id", instanceId)
          .single();

        if (error || !instance) {
          return new Response(
            JSON.stringify({ error: "Instance not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        try {
          await uazapi.disconnect(instance.instance_key);
          
          await supabase
            .from("whatsapp_instances")
            .update({ status: "disconnected", phone_connected: null })
            .eq("id", instanceId);

          return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "delete": {
        const instanceId = entityId;
        
        const { data: instance, error } = await supabase
          .from("whatsapp_instances")
          .select("*")
          .eq("id", instanceId)
          .single();

        if (error || !instance) {
          return new Response(
            JSON.stringify({ error: "Instance not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Try to disconnect first
        try {
          await uazapi.disconnect(instance.instance_key);
        } catch (error) {
          console.error("UAZAPI disconnect error:", error);
        }

        // Delete from database
        await supabase
          .from("whatsapp_instances")
          .delete()
          .eq("id", instanceId);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        console.log("Invalid action:", action);
        return new Response(
          JSON.stringify({ error: `Invalid action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: any) {
    console.error("Error in whatsapp-instances:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
