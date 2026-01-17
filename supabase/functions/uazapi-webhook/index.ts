// Uazapi - Webhook for receiving messages and events
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WebhookEvent {
  event: string;
  instance?: string;
  data?: any;
  message?: {
    id: string;
    from: string;
    to?: string;
    body?: string;
    type?: string;
    timestamp?: number;
    fromMe?: boolean;
    isGroup?: boolean;
    pushName?: string;
    participant?: string;
    media?: {
      url?: string;
      mimetype?: string;
      filename?: string;
    };
  };
  status?: {
    id: string;
    status: string;
    timestamp?: number;
  };
}

serve(async (req: Request): Promise<Response> => {
  console.log("=== UAZAPI WEBHOOK RECEIVED ===");
  console.log("Method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.text();
    console.log("Raw body:", body);

    let event: WebhookEvent;
    try {
      event = JSON.parse(body);
    } catch {
      console.error("Failed to parse webhook body");
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Event type:", event.event);
    console.log("Event data:", JSON.stringify(event, null, 2));

    // Handle different event types
    switch (event.event) {
      case "messages.upsert":
      case "message":
      case "message.received": {
        // New message received
        const message = event.message || event.data?.message;
        if (message && !message.fromMe) {
          console.log("New message from:", message.from);
          console.log("Message body:", message.body);
          console.log("Push name:", message.pushName);

          // Store incoming message in database
          const { error: insertError } = await supabase
            .from("whatsapp_messages")
            .insert({
              message_id: message.id,
              from_number: message.from?.replace("@s.whatsapp.net", "").replace("@c.us", ""),
              to_number: message.to?.replace("@s.whatsapp.net", "").replace("@c.us", ""),
              body: message.body || "",
              message_type: message.type || "text",
              from_me: message.fromMe || false,
              is_group: message.isGroup || false,
              push_name: message.pushName,
              timestamp: message.timestamp ? new Date(message.timestamp * 1000).toISOString() : new Date().toISOString(),
              raw_data: event,
            });

          if (insertError) {
            console.error("Error storing message:", insertError);
          } else {
            console.log("Message stored successfully");
          }
        }
        break;
      }

      case "messages.update":
      case "message.status":
      case "status": {
        // Message status update (sent, delivered, read)
        const status = event.status || event.data?.status;
        if (status) {
          console.log("Status update:", status.status, "for message:", status.id);

          // Update message status in database
          const { error: updateError } = await supabase
            .from("whatsapp_messages")
            .update({ 
              status: status.status,
              updated_at: new Date().toISOString()
            })
            .eq("message_id", status.id);

          if (updateError) {
            console.error("Error updating status:", updateError);
          }
        }
        break;
      }

      case "connection.update":
      case "connection": {
        // Connection status change
        const connectionStatus = event.data?.state || event.data?.status;
        console.log("Connection status:", connectionStatus);
        break;
      }

      case "qr":
      case "qrcode": {
        // QR Code update
        console.log("QR Code received");
        break;
      }

      default:
        console.log("Unhandled event type:", event.event);
    }

    return new Response(
      JSON.stringify({ success: true, event: event.event }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Webhook error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
