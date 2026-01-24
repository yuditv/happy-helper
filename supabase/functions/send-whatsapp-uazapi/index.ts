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

    let endpoint: string;
    let body: Record<string, any>;

    // Determine endpoint and body based on media type
    // UAZAPI v2 uses /{token}/sendText format with lowercase keys (phone, message)
    if (mediaType && mediaType !== 'none' && mediaUrl) {
      switch (mediaType) {
        case 'image':
          endpoint = '/sendImage';
          body = {
            phone: formattedPhone,
            image: mediaUrl,
            caption: caption || message || ''
          };
          break;
        case 'video':
          endpoint = '/sendVideo';
          body = {
            phone: formattedPhone,
            video: mediaUrl,
            caption: caption || message || ''
          };
          break;
        case 'audio':
          endpoint = '/sendAudio';
          body = {
            phone: formattedPhone,
            audio: mediaUrl,
            ptt: true
          };
          break;
        case 'document':
          endpoint = '/sendDocument';
          body = {
            phone: formattedPhone,
            document: mediaUrl,
            filename: fileName || 'document'
          };
          break;
        default:
          endpoint = '/sendText';
          body = {
            phone: formattedPhone,
            message: message || ''
          };
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
      endpoint = '/sendText';
      body = {
        phone: formattedPhone,
        message: message
      };
    }

    // UAZAPI v2: token goes in URL path: {base_url}/{token}/sendText
    const fullUrl = `${UAZAPI_URL}/${instanceToken}${endpoint}`;
    console.log(`Calling UAZAPI endpoint: ${endpoint}`);
    console.log(`Full URL: ${fullUrl}`);
    console.log(`Token (first 8 chars): ${instanceToken.substring(0, 8)}...`);
    console.log(`Request body:`, JSON.stringify(body));

    // No token header needed - token is in URL path
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();
    console.log("Uazapi response status:", response.status);
    console.log("Uazapi response:", responseData);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: responseData.message || "Failed to send message" }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Archive chat if autoArchive is enabled
    let archived = false;
    if (autoArchive) {
      try {
        console.log(`[Archive] Attempting to archive chat with: ${formattedPhone}`);
        console.log(`[Archive] Using instance token: ${instanceKey ? 'custom' : 'default'}`);
        
        const archiveResponse = await fetch(`${UAZAPI_URL}/chat/archiveChat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": instanceToken,
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
