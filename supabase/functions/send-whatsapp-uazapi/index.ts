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

    // Try multiple endpoint formats - different UAZAPI/Wuzapi versions use different formats
    const textEndpoints = [
      { url: `${UAZAPI_URL}/send-text`, header: 'token' },           // Z-API/UAZAPI v2 format
      { url: `${UAZAPI_URL}/message/sendText`, header: 'token' },    // UAZAPI alt format  
      { url: `${UAZAPI_URL}/chat/send/text`, header: 'Token' },      // Wuzapi format (capital T)
      { url: `${UAZAPI_URL}/chat/send`, header: 'token' },           // Unified endpoint
    ];

    let body: Record<string, any>;

    if (mediaType && mediaType !== 'none' && mediaUrl) {
      switch (mediaType) {
        case 'image':
          body = { phone: formattedPhone, image: mediaUrl, caption: caption || message || '' };
          break;
        case 'video':
          body = { phone: formattedPhone, video: mediaUrl, caption: caption || message || '' };
          break;
        case 'audio':
          body = { phone: formattedPhone, audio: mediaUrl };
          break;
        case 'document':
          body = { phone: formattedPhone, document: mediaUrl, filename: fileName || 'document' };
          break;
        default:
          body = { phone: formattedPhone, message: message || '' };
      }
    } else {
      // Text message
      if (!message) {
        return new Response(
          JSON.stringify({ error: "Missing required field: message (for text messages)" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      body = { phone: formattedPhone, message };
    }

    let responseData: any = null;
    let lastError = '';

    // Try each endpoint until one works
    for (const endpoint of textEndpoints) {
      console.log(`Trying UAZAPI endpoint: ${endpoint.url}`);
      console.log(`Headers: ${endpoint.header}=${instanceToken.substring(0, 8)}...`);
      console.log(`Request body:`, JSON.stringify(body));

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [endpoint.header]: instanceToken
        },
        body: JSON.stringify(body),
      });

      const respText = await response.text();
      console.log(`Response status: ${response.status}, body: ${respText}`);

      if (response.ok || response.status === 200 || response.status === 201) {
        try {
          responseData = JSON.parse(respText);
        } catch {
          responseData = { raw: respText };
        }
        console.log("Message sent successfully!");
        break;
      } else {
        lastError = respText;
      }
    }

    if (!responseData) {
      console.error("All endpoints failed. Last error:", lastError);
      return new Response(
        JSON.stringify({ error: lastError || "Failed to send message via all endpoints" }),
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
