import { supabase } from '@/integrations/supabase/client';

interface SendWhatsAppResult {
  success: boolean;
  error?: string;
  data?: any;
}

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface MediaAttachment {
  file: File;
  type: MediaType;
  preview?: string;
}

export function getMediaTypeFromFile(file: File): MediaType {
  const mimeType = file.type;
  
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

export function getMediaTypeLabel(type: MediaType): string {
  switch (type) {
    case 'image': return 'Imagem';
    case 'video': return 'Vídeo';
    case 'audio': return 'Áudio';
    case 'document': return 'Documento';
  }
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<SendWhatsAppResult> {
  try {
    const { data, error } = await supabase.functions.invoke('uazapi-send-message', {
      body: { phone, message },
    });

    if (error) {
      console.error('Error calling uazapi-send-message:', error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

export async function sendWhatsAppMedia(
  phone: string,
  mediaBase64: string,
  mediaType: MediaType,
  fileName: string,
  mimetype: string,
  caption?: string
): Promise<SendWhatsAppResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp-media', {
      body: { 
        phone, 
        message: caption,
        mediaBase64,
        mediaType,
        fileName,
        mimetype,
      },
    });

    if (error) {
      console.error('Error calling send-whatsapp-media:', error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending WhatsApp media:', error);
    return { success: false, error: error.message };
  }
}

export async function sendBulkWhatsAppMessages(
  messages: Array<{ phone: string; message: string }>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const { phone, message } of messages) {
    const result = await sendWhatsAppMessage(phone, message);
    
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(`${phone}: ${result.error}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

export async function sendBulkWhatsAppMedia(
  recipients: Array<{ phone: string; caption?: string }>,
  mediaBase64: string,
  mediaType: MediaType,
  fileName: string,
  mimetype: string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const { phone, caption } of recipients) {
    const result = await sendWhatsAppMedia(phone, mediaBase64, mediaType, fileName, mimetype, caption);
    
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(`${phone}: ${result.error}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  return results;
}
