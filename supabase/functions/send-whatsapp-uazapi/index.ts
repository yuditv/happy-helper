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
    const { phone, message, mediaType, mediaUrl, fileName, caption, autoArchive } = requestData;

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Missing required field: phone" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);
    console.log(`Sending WhatsApp to: ${formattedPhone}, mediaType: ${mediaType || 'text'}`);

    let endpoint: string;
    let body: Record<string, any>;

    // Determine endpoint and body based on media type
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
            ptt: true // Send as voice note
          };
          break;
        case 'document':
          endpoint = '/sendDocument';
          body = {
            phone: formattedPhone,
            document: mediaUrl,
            filename: fileName || 'document',
            caption: caption || message || ''
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

    console.log(`Calling UAZAPI endpoint: ${endpoint}`);

    const response = await fetch(`${UAZAPI_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${UAZAPI_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();
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
    if (autoArchive) {
      try {
        console.log(`Archiving chat with: ${formattedPhone}`);
        const archiveResponse = await fetch(`${UAZAPI_URL}/archiveChat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${UAZAPI_TOKEN}`,
          },
          body: JSON.stringify({
            phone: formattedPhone,
            archive: true
          }),
        });
        const archiveData = await archiveResponse.json();
        console.log("Archive response:", archiveData);
      } catch (archiveError) {
        console.error("Error archiving chat:", archiveError);
        // Don't fail the request if archiving fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
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
