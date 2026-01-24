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

    // Wuzapi format: Token header (capital T), /chat/send/[type] endpoints, PascalCase keys
    let endpoint: string;
    let body: Record<string, any>;

    if (mediaType && mediaType !== 'none' && mediaUrl) {
      switch (mediaType) {
        case 'image':
          endpoint = `${UAZAPI_URL}/chat/send/image`;
          body = {
            Phone: formattedPhone,
            Image: mediaUrl,
            Caption: caption || message || ''
          };
          break;
        case 'video':
          endpoint = `${UAZAPI_URL}/chat/send/video`;
          body = {
            Phone: formattedPhone,
            Video: mediaUrl,
            Caption: caption || message || ''
          };
          break;
        case 'audio':
          endpoint = `${UAZAPI_URL}/chat/send/audio`;
          body = {
            Phone: formattedPhone,
            Audio: mediaUrl
          };
          break;
        case 'document':
          endpoint = `${UAZAPI_URL}/chat/send/document`;
          body = {
            Phone: formattedPhone,
            Document: mediaUrl,
            FileName: fileName || 'document'
          };
          break;
        default:
          endpoint = `${UAZAPI_URL}/chat/send/text`;
          body = {
            Phone: formattedPhone,
            Body: message || ''
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
      endpoint = `${UAZAPI_URL}/chat/send/text`;
      body = {
        Phone: formattedPhone,
        Body: message
      };
    }

    console.log(`Calling UAZAPI endpoint: ${endpoint}`);
    console.log(`Request body:`, JSON.stringify(body));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Token": instanceToken
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
        
        const archiveResponse = await fetch(`${UAZAPI_URL}/chat/archive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Token": instanceToken
          },
          body: JSON.stringify({
            Phone: formattedPhone,
            Archive: true
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
