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

    let body: Record<string, any>;

    // UAZAPI zynk2 format: single endpoint, lowercase token header, lowercase body keys
    if (mediaType && mediaType !== 'none' && mediaUrl) {
      switch (mediaType) {
        case 'image':
          body = {
            phone: formattedPhone,
            image: mediaUrl,
            caption: caption || message || ''
          };
          break;
        case 'video':
          body = {
            phone: formattedPhone,
            video: mediaUrl,
            caption: caption || message || ''
          };
          break;
        case 'audio':
          body = {
            phone: formattedPhone,
            audio: mediaUrl
          };
          break;
        case 'document':
          body = {
            phone: formattedPhone,
            document: mediaUrl,
            fileName: fileName || 'document'
          };
          break;
        default:
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
      body = {
        phone: formattedPhone,
        message: message
      };
    }

    // UAZAPI zynk2 format: single endpoint /chat/send
    const fullUrl = `${UAZAPI_URL}/chat/send`;
    console.log(`Calling UAZAPI endpoint: /chat/send`);
    console.log(`Full URL: ${fullUrl}`);
    console.log(`Token (first 8 chars): ${instanceToken.substring(0, 8)}...`);
    console.log(`Request body:`, JSON.stringify(body));

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken,
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
