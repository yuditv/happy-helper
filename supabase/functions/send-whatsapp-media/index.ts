import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MediaType = 'image' | 'video' | 'audio' | 'document';

interface SendWhatsAppMediaRequest {
  phone: string;
  message?: string;
  mediaUrl?: string;
  mediaBase64?: string;
  mediaType: MediaType;
  fileName?: string;
  mimetype?: string;
}

function formatPhoneForWhatsApp(phone: string): string {
  const numbersOnly = phone.replace(/\D/g, '');
  if (numbersOnly.length <= 11) {
    return `55${numbersOnly}`;
  }
  return numbersOnly;
}

function getEndpoint(mediaType: MediaType): string {
  switch (mediaType) {
    case 'image':
    case 'video':
    case 'document':
      return 'sendMedia';
    case 'audio':
      return 'sendWhatsAppAudio';
    default:
      return 'sendMedia';
  }
}

function getMimeType(fileName: string, mediaType: MediaType): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    // Videos
    'mp4': 'video/mp4',
    'avi': 'video/avi',
    'mov': 'video/quicktime',
    'mkv': 'video/x-matroska',
    // Audio
    'mp3': 'audio/mpeg',
    'ogg': 'audio/ogg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
  };

  if (ext && mimeTypes[ext]) {
    return mimeTypes[ext];
  }

  // Default based on media type
  switch (mediaType) {
    case 'image': return 'image/jpeg';
    case 'video': return 'video/mp4';
    case 'audio': return 'audio/mpeg';
    case 'document': return 'application/octet-stream';
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE");

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
      console.error("Missing Evolution API configuration");
      return new Response(
        JSON.stringify({ 
          error: "Evolution API not configured. Please set EVOLUTION_API_URL, EVOLUTION_API_KEY, and EVOLUTION_INSTANCE secrets." 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { 
      phone, 
      message, 
      mediaUrl, 
      mediaBase64, 
      mediaType, 
      fileName,
      mimetype 
    }: SendWhatsAppMediaRequest = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!mediaUrl && !mediaBase64) {
      return new Response(
        JSON.stringify({ error: "Either mediaUrl or mediaBase64 is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedPhone = formatPhoneForWhatsApp(phone);
    const endpoint = getEndpoint(mediaType);
    const finalMimetype = mimetype || getMimeType(fileName || 'file', mediaType);
    
    console.log(`Sending ${mediaType} to ${formattedPhone} via ${endpoint}`);

    let apiUrl: string;
    let body: Record<string, unknown>;

    if (mediaType === 'audio') {
      // Audio endpoint - /message/sendWhatsAppAudio/{instance}
      apiUrl = `${evolutionApiUrl}/message/sendWhatsAppAudio/${evolutionInstance}`;
      body = {
        number: formattedPhone,
        audio: mediaUrl || mediaBase64,
        delay: 1000,
      };
    } else {
      // Media endpoint - /message/sendMedia/{instance}
      apiUrl = `${evolutionApiUrl}/message/sendMedia/${evolutionInstance}`;
      body = {
        number: formattedPhone,
        media: mediaUrl || mediaBase64,
        mediatype: mediaType,
        mimetype: finalMimetype,
        caption: message || '',
        fileName: fileName || `file.${finalMimetype.split('/')[1] || 'bin'}`,
      };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey,
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Evolution API error:", responseData);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send WhatsApp media", 
          details: responseData 
        }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("WhatsApp media sent successfully:", responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "WhatsApp media sent successfully",
        data: responseData 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-whatsapp-media function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
