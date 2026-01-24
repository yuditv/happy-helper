import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  instanceKey?: string;
  phone: string;
  message?: string;
  // Media fields
  mediaType?: 'none' | 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  fileName?: string;
  caption?: string;
  // Auto archive after sending
  autoArchive?: boolean;
}

// Format phone number to international format (55 + DDD + number)
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
    const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      console.error("Missing UAZAPI configuration");
      return new Response(
        JSON.stringify({ error: "UAZAPI not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const requestData: WhatsAppRequest = await req.json();
    const { phone, message, mediaType, mediaUrl, fileName, caption, autoArchive, instanceKey } = requestData;

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Missing required field: phone" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Use instance-specific token if provided, otherwise fallback to default
    const instanceToken = instanceKey || UAZAPI_TOKEN;
    
    const formattedPhone = formatPhoneNumber(phone);
    console.log(`Sending WhatsApp to: ${formattedPhone}, mediaType: ${mediaType || 'text'}, using instance: ${instanceKey ? 'custom' : 'default'}`);

    // Validate message for text messages
    if ((!mediaType || mediaType === 'none') && !message) {
      return new Response(
        JSON.stringify({ error: "Missing required field: message (for text messages)" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Use same format as scheduled-dispatcher (which works!)
    // Header: "token" (lowercase, no Bearer)
    // Body: { number, text } (not phone/message)
    console.log(`Sending via /sendText`);
    console.log(`URL: ${UAZAPI_URL}/sendText`);
    console.log(`Phone: ${formattedPhone}`);

    // deno-lint-ignore no-explicit-any
    let responseData: any = null;
    let lastError = '';

    // Determine endpoint based on media type
    if (mediaType && mediaType !== 'none' && mediaUrl) {
      // Media message
      let endpoint = '/sendImage';
      // deno-lint-ignore no-explicit-any
      const body: Record<string, any> = { number: formattedPhone };
      
      switch (mediaType) {
        case 'image':
          endpoint = '/sendImage';
          body.image = mediaUrl;
          body.caption = caption || message || '';
          break;
        case 'video':
          endpoint = '/sendVideo';
          body.video = mediaUrl;
          body.caption = caption || message || '';
          break;
        case 'audio':
          endpoint = '/sendAudio';
          body.audio = mediaUrl;
          break;
        case 'document':
          endpoint = '/sendDocument';
          body.document = mediaUrl;
          body.filename = fileName || 'document';
          break;
        default:
          endpoint = '/sendText';
          body.text = message || '';
      }
      
      console.log(`Sending media via ${endpoint}`);
      
      const response = await fetch(`${UAZAPI_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": instanceToken
        },
        body: JSON.stringify(body),
      });
      
      const respText = await response.text();
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${respText}`);
      
      if (response.ok) {
        try {
          responseData = JSON.parse(respText);
        } catch {
          responseData = { raw: respText };
        }
        console.log("✅ Media sent successfully!");
      } else {
        lastError = `${response.status}: ${respText}`;
      }
    } else {
      // Text message - use /sendText with { number, text }
      const response = await fetch(`${UAZAPI_URL}/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": instanceToken
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message
        }),
      });
      
      const respText = await response.text();
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${respText}`);
      
      if (response.ok) {
        try {
          responseData = JSON.parse(respText);
        } catch {
          responseData = { raw: respText };
        }
        console.log("✅ Message sent successfully!");
      } else {
        lastError = `${response.status}: ${respText}`;
      }
    }

    if (!responseData) {
      console.error("Failed to send. Error:", lastError);
      return new Response(
        JSON.stringify({ error: lastError || "Failed to send message" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Archive chat if autoArchive is enabled
    let archived = false;
    if (autoArchive) {
      try {
        console.log(`[Archive] Attempting to archive chat with: ${formattedPhone}`);
        
        const archiveResponse = await fetch(`${UAZAPI_URL}/chat/archive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": instanceToken  // lowercase 'token' header
          },
          body: JSON.stringify({
            phone: formattedPhone,
            archive: true
          }),
        });
        
        const archiveData = await archiveResponse.json();
        
        if (!archiveResponse.ok) {
          console.error(`[Archive] Failed with status ${archiveResponse.status}:`, archiveData);
        } else {
          console.log("[Archive] Success:", archiveData);
          archived = true;
        }
      } catch (archiveError) {
        console.error("[Archive] Error:", archiveError);
        // Don't fail the request if archiving fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData, archived }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-whatsapp-uazapi:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
