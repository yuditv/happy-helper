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

    // Wuzapi/uazapiGO format:
    // - Endpoint: /chat/send/text, /chat/send/image, etc.
    // - Header: Token (PascalCase)
    // - Body: Phone, Body, Image, Caption (PascalCase)
    console.log(`Sending via Wuzapi format`);
    console.log(`Phone: ${formattedPhone}`);

    // deno-lint-ignore no-explicit-any
    let responseData: any = null;
    let lastError = '';

    // Determine endpoint based on media type
    if (mediaType && mediaType !== 'none' && mediaUrl) {
      // Media message
      let endpoint = '/chat/send/image';
      // deno-lint-ignore no-explicit-any
      const body: Record<string, any> = { Phone: formattedPhone };
      
      switch (mediaType) {
        case 'image':
          endpoint = '/chat/send/image';
          body.Image = mediaUrl;
          body.Caption = caption || message || '';
          break;
        case 'video':
          endpoint = '/chat/send/video';
          body.Video = mediaUrl;
          body.Caption = caption || message || '';
          break;
        case 'audio':
          endpoint = '/chat/send/audio';
          body.Audio = mediaUrl;
          break;
        case 'document':
          endpoint = '/chat/send/document';
          body.Document = mediaUrl;
          body.FileName = fileName || 'document';
          break;
        default:
          endpoint = '/chat/send/text';
          body.Body = message || '';
      }
      
      console.log(`Sending media via ${endpoint}`);
      console.log(`URL: ${UAZAPI_URL}${endpoint}`);
      
      const response = await fetch(`${UAZAPI_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Token": instanceToken
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
      // Text message - use /chat/send/text with { Phone, Body }
      console.log(`Sending text via /chat/send/text`);
      console.log(`URL: ${UAZAPI_URL}/chat/send/text`);
      
      const response = await fetch(`${UAZAPI_URL}/chat/send/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Token": instanceToken
        },
        body: JSON.stringify({
          Phone: formattedPhone,
          Body: message
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
            "Token": instanceToken
          },
          body: JSON.stringify({
            Phone: formattedPhone,
            State: true
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
