import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// UAZAPI Service - Isolated service for WhatsApp API
class UazapiService {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = Deno.env.get("UAZAPI_URL") || "https://zynk2.uazapi.com";
    this.token = Deno.env.get("UAZAPI_TOKEN") || "";
  }

  private async request(endpoint: string, method: string = "GET", body?: any) {
    console.log(`UAZAPI Request: ${method} ${this.baseUrl}${endpoint}`);
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    console.log(`UAZAPI Response:`, JSON.stringify(data));
    
    if (!response.ok) {
      throw new Error(data.message || `UAZAPI Error: ${response.status}`);
    }

    return data;
  }

  async createInstance(instanceKey: string) {
    return this.request("/instance/create", "POST", { 
      instanceKey,
      token: this.token 
    });
  }

  async getQRCode(instanceKey: string) {
    return this.request(`/instance/qrcode/${instanceKey}`);
  }

  async getStatus(instanceKey: string) {
    return this.request(`/instance/status/${instanceKey}`);
  }

  async sendText(instanceKey: string, phone: string, message: string) {
    return this.request("/sendText", "POST", {
      instanceKey,
      phone: this.formatPhone(phone),
      message,
    });
  }

  async disconnect(instanceKey: string) {
    return this.request(`/instance/disconnect/${instanceKey}`, "POST");
  }

  async delete(instanceKey: string) {
    return this.request(`/instance/delete/${instanceKey}`, "DELETE");
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
    // Parse the path correctly - the function name is in the path
    // URL format: /whatsapp-instances/action/id
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

    let body = {};
    if (req.method !== "GET") {
      try {
        body = await req.json();
        console.log("Request body:", body);
      } catch (e) {
        console.log("No body or invalid JSON");
      }
    }

    switch (action) {
      case "create": {
        console.log("Creating instance...");
        // Create instance in UAZAPI
        const instanceKey = `inst_${user.id.slice(0, 8)}_${Date.now()}`;
        
        try {
          const uazapiResult = await uazapi.createInstance(instanceKey);
          console.log("UAZAPI create result:", uazapiResult);
        } catch (error: any) {
          console.error("UAZAPI create error (continuing anyway):", error.message);
          // Continue anyway - we'll create the DB record
        }

        // Save to database
        const { data: instance, error } = await supabase
          .from("whatsapp_instances")
          .insert({
            user_id: user.id,
            name: (body as any).name || "Nova Instância",
            instance_key: instanceKey,
            daily_limit: (body as any).daily_limit || 200,
            business_hours_start: (body as any).business_hours_start || "08:00:00",
            business_hours_end: (body as any).business_hours_end || "18:00:00",
          })
          .select()
          .single();

        if (error) {
          console.error("DB insert error:", error);
          throw error;
        }

        console.log("Instance created:", instance);
        return new Response(
          JSON.stringify({ success: true, instance }),
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
          const qrData = await uazapi.getQRCode(instance.instance_key);
          
          // Update instance with QR code
          await supabase
            .from("whatsapp_instances")
            .update({ qr_code: qrData.qrcode || qrData.base64 })
            .eq("id", instanceId);

          return new Response(
            JSON.stringify({ success: true, qrcode: qrData.qrcode || qrData.base64 }),
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
          const isConnected = statusData.connected || statusData.state === "connected";
          
          // Update instance status
          await supabase
            .from("whatsapp_instances")
            .update({ 
              status: isConnected ? "connected" : "disconnected",
              phone_connected: statusData.phone || null,
            })
            .eq("id", instanceId);

          return new Response(
            JSON.stringify({ 
              success: true, 
              status: isConnected ? "connected" : "disconnected",
              phone: statusData.phone || null,
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

        try {
          await uazapi.delete(instance.instance_key);
        } catch (error) {
          console.error("UAZAPI delete error:", error);
        }

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
