import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  instanceKey?: string;
  instanceName?: string;  // Session name for uazapiGO v2
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
    const { phone, message, mediaType, mediaUrl, fileName, caption, autoArchive, instanceKey, instanceName } = requestData;

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
    // Session name for uazapiGO v2
    const sessionName = instanceName || '';
    
    const formattedPhone = formatPhoneNumber(phone);
    console.log(`Sending WhatsApp to: ${formattedPhone}, mediaType: ${mediaType || 'text'}, session: ${sessionName}, using instance: ${instanceKey ? 'custom' : 'default'}`);

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

    // UAZAPI format:
    // - Endpoint: /sendText, /sendImage, etc.
    // - Header: token (lowercase)
    // - Body: number, text (lowercase)
    console.log(`Sending via UAZAPI format`);
    console.log(`Phone: ${formattedPhone}`);

    // deno-lint-ignore no-explicit-any
    let responseData: any = null;
    let lastError = '';

    // Determine endpoint based on media type
    if (mediaType && mediaType !== 'none' && mediaUrl) {
      // Media message
      let endpoint = '/send/image';
      // deno-lint-ignore no-explicit-any
      const body: Record<string, any> = { 
        number: formattedPhone 
      };
      
      switch (mediaType) {
        case 'image':
          endpoint = '/send/image';
          body.url = mediaUrl;
          body.caption = caption || message || '';
          break;
        case 'video':
          endpoint = '/send/video';
          body.url = mediaUrl;
          body.caption = caption || message || '';
          break;
        case 'audio':
          endpoint = '/send/audio';
          body.url = mediaUrl;
          break;
        case 'document':
          endpoint = '/send/document';
          body.url = mediaUrl;
          body.fileName = fileName || 'document';
          break;
        default:
          endpoint = '/send/text';
          body.text = message || '';
      }
      
      console.log(`Sending media via ${endpoint}`);
      console.log(`URL: ${UAZAPI_URL}${endpoint}`);
      
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
      // Text message - use /send/text with { number, text }
      console.log(`Sending text via /send/text`);
      console.log(`URL: ${UAZAPI_URL}/send/text`);
      
      const response = await fetch(`${UAZAPI_URL}/send/text`, {
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
            "token": instanceToken
          },
          body: JSON.stringify({
            number: formattedPhone,
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
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData, archived }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-whatsapp-uazapi:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
