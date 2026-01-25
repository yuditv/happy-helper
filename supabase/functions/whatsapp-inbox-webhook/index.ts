import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ===== Message Sending Utilities =====

interface MessageSendConfig {
  response_delay_min: number;
  response_delay_max: number;
  max_lines_per_message: number;
  split_mode: 'none' | 'paragraph' | 'lines' | 'sentences' | 'chars';
  split_delay_min: number;
  split_delay_max: number;
  max_chars_per_message: number;
  typing_simulation: boolean;
}

const DEFAULT_SEND_CONFIG: MessageSendConfig = {
  response_delay_min: 2,
  response_delay_max: 5,
  max_lines_per_message: 0,
  split_mode: 'none',
  split_delay_min: 1,
  split_delay_max: 3,
  max_chars_per_message: 0,
  typing_simulation: true
};

/**
 * Sleep for a random duration between min and max milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get a random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Split message into chunks based on the configured mode
 */
function splitMessage(text: string, config: MessageSendConfig): string[] {
  if (!text || text.trim().length === 0) return [];
  
  if (config.split_mode === 'none' && config.max_lines_per_message === 0 && config.max_chars_per_message === 0) {
    return [text];
  }
  
  let parts: string[] = [];
  
  // First, split by mode
  switch (config.split_mode) {
    case 'paragraph':
      parts = text.split(/\n\n+/).filter(p => p.trim());
      break;
    case 'lines':
      parts = text.split(/\n/).filter(p => p.trim());
      break;
    case 'sentences':
      // Split by sentence-ending punctuation
      const sentenceMatches = text.match(/[^.!?]+[.!?]+[\s]*/g);
      if (sentenceMatches && sentenceMatches.length > 0) {
        parts = sentenceMatches.map(s => s.trim()).filter(s => s);
      } else {
        parts = [text];
      }
      break;
    case 'chars':
      if (config.max_chars_per_message > 0) {
        parts = chunkByChars(text, config.max_chars_per_message);
      } else {
        parts = [text];
      }
      break;
    default:
      parts = [text];
  }
  
  // Apply character limit if set and mode is not 'chars'
  if (config.split_mode !== 'chars' && config.max_chars_per_message > 0) {
    parts = parts.flatMap(p => chunkByChars(p, config.max_chars_per_message));
  }
  
  // Apply line limit if set
  if (config.max_lines_per_message > 0) {
    parts = parts.flatMap(p => chunkByLines(p, config.max_lines_per_message));
  }
  
  return parts.filter(p => p.trim());
}

/**
 * Chunk text by maximum character count, trying to break at word boundaries
 */
function chunkByChars(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining.trim());
      break;
    }
    
    // Find a good break point (space, newline)
    let breakPoint = maxChars;
    const lastSpace = remaining.lastIndexOf(' ', maxChars);
    const lastNewline = remaining.lastIndexOf('\n', maxChars);
    
    if (lastSpace > maxChars * 0.5 || lastNewline > maxChars * 0.5) {
      breakPoint = Math.max(lastSpace, lastNewline);
    }
    
    chunks.push(remaining.substring(0, breakPoint).trim());
    remaining = remaining.substring(breakPoint).trim();
  }
  
  return chunks;
}

/**
 * Chunk text by maximum line count
 */
function chunkByLines(text: string, maxLines: number): string[] {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return [text];
  
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    const chunk = lines.slice(i, i + maxLines).join('\n');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}

/**
 * Send presence/typing indicator via UAZAPI
 */
async function sendTypingIndicator(
  uazapiUrl: string, 
  instanceKey: string, 
  phone: string,
  duration: number = 2000
): Promise<void> {
  try {
    await fetch(`${uazapiUrl}/send/presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceKey
      },
      body: JSON.stringify({
        number: phone,
        presence: 'composing',
        delay: duration
      })
    });
    // Wait a bit for the typing to show
    await sleep(Math.min(duration, 1500));
  } catch (e) {
    console.error('[Inbox Webhook] Error sending typing indicator:', e);
  }
}

/**
 * Calculate typing simulation time based on message length
 */
function calculateTypingTime(message: string): number {
  // Simulate typing at ~30-50 chars per second, with some randomness
  const baseTime = (message.length / 40) * 1000;
  return Math.min(Math.max(baseTime, 500), 3000); // Between 0.5s and 3s
}

/**
 * Send a single text message via UAZAPI
 */
async function sendTextViaUazapi(
  uazapiUrl: string,
  instanceKey: string,
  phone: string,
  text: string
): Promise<boolean> {
  try {
    const response = await fetch(`${uazapiUrl}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceKey
      },
      body: JSON.stringify({
        number: phone,
        text: text
      })
    });
    return response.ok;
  } catch (e) {
    console.error('[Inbox Webhook] Error sending text:', e);
    return false;
  }
}

/**
 * Send AI response with configured delays and splitting
 */
async function sendAIResponseWithConfig(
  uazapiUrl: string,
  instanceKey: string,
  phone: string,
  fullResponse: string,
  config: MessageSendConfig
): Promise<void> {
  console.log(`[Inbox Webhook] Sending AI response with config:`, {
    split_mode: config.split_mode,
    response_delay: `${config.response_delay_min}-${config.response_delay_max}s`,
    typing: config.typing_simulation
  });
  
  // 1. Apply initial response delay
  if (config.response_delay_max > 0) {
    const delaySeconds = randomBetween(config.response_delay_min, config.response_delay_max);
    console.log(`[Inbox Webhook] Waiting ${delaySeconds}s before responding...`);
    await sleep(delaySeconds * 1000);
  }
  
  // 2. Split message according to configuration
  const messageParts = splitMessage(fullResponse, config);
  console.log(`[Inbox Webhook] Message split into ${messageParts.length} parts`);
  
  // 3. Send each part with optional delays
  for (let i = 0; i < messageParts.length; i++) {
    const part = messageParts[i];
    
    // Simulate typing if enabled
    if (config.typing_simulation) {
      const typingTime = calculateTypingTime(part);
      await sendTypingIndicator(uazapiUrl, instanceKey, phone, typingTime);
    }
    
    // Send the message part
    const sent = await sendTextViaUazapi(uazapiUrl, instanceKey, phone, part);
    console.log(`[Inbox Webhook] Sent part ${i + 1}/${messageParts.length}: ${sent ? 'OK' : 'FAILED'}`);
    
    // Delay between parts (except for last)
    if (i < messageParts.length - 1 && config.split_delay_max > 0) {
      const splitDelay = randomBetween(config.split_delay_min, config.split_delay_max);
      console.log(`[Inbox Webhook] Waiting ${splitDelay}s before next part...`);
      await sleep(splitDelay * 1000);
    }
  }
  
  console.log('[Inbox Webhook] All message parts sent successfully');
}

// ===== Owner Notification Event Detection =====

type NotificationEventType = 
  | 'ai_uncertainty'
  | 'payment_proof'
  | 'new_contact'
  | 'complaint'
  | 'vip_message'
  | 'long_wait';

interface DetectedEvent {
  shouldNotify: boolean;
  eventType: NotificationEventType;
  summary: string;
  urgency: 'low' | 'medium' | 'high';
}

/**
 * Detect if a message/event should trigger an owner notification
 */
function detectNotifiableEvent(
  messageContent: string,
  mediaType: string | undefined,
  isNewContact: boolean,
  clientMemory: any
): DetectedEvent {
  const lowerMessage = (messageContent || '').toLowerCase();
  
  // Payment proof detection (image + payment keywords)
  const paymentKeywords = ['paguei', 'comprovante', 'pix', 'transferi', 'pagamento', 'pago', 'deposito', 'depositei', 'boleto'];
  const hasPaymentKeyword = paymentKeywords.some(kw => lowerMessage.includes(kw));
  
  if (mediaType === 'image' && (hasPaymentKeyword || lowerMessage.length < 50)) {
    // Image with payment keyword or short message = likely payment proof
    if (hasPaymentKeyword || lowerMessage === '' || lowerMessage.length < 20) {
      return {
        shouldNotify: true,
        eventType: 'payment_proof',
        summary: `Cliente enviou imagem${hasPaymentKeyword ? ' com menção a pagamento' : ' (possível comprovante)'}`,
        urgency: 'medium'
      };
    }
  }
  
  // Complaint detection
  const complaintKeywords = [
    'problema', 'não funciona', 'travando', 'ruim', 'péssimo', 'reclamar', 
    'insatisfeito', 'devolução', 'reembolso', 'cancelar', 'não abre', 
    'não carrega', 'parou', 'quebrou', 'horrível', 'lixo'
  ];
  const hasComplaint = complaintKeywords.some(kw => lowerMessage.includes(kw));
  
  if (hasComplaint) {
    return {
      shouldNotify: true,
      eventType: 'complaint',
      summary: `Possível reclamação: "${messageContent.substring(0, 80)}${messageContent.length > 80 ? '...' : ''}"`,
      urgency: 'high'
    };
  }
  
  // Urgency detection
  const urgentKeywords = ['urgente', 'emergência', 'socorro', 'ajuda', 'por favor'];
  const hasUrgency = urgentKeywords.some(kw => lowerMessage.includes(kw));
  
  if (hasUrgency && lowerMessage.length > 10) {
    return {
      shouldNotify: true,
      eventType: 'complaint',
      summary: `Mensagem urgente: "${messageContent.substring(0, 80)}${messageContent.length > 80 ? '...' : ''}"`,
      urgency: 'high'
    };
  }
  
  // VIP client detection
  if (clientMemory?.is_vip) {
    return {
      shouldNotify: true,
      eventType: 'vip_message',
      summary: `Cliente VIP ${clientMemory.client_name || ''} mandou mensagem: "${messageContent.substring(0, 60)}..."`,
      urgency: 'medium'
    };
  }
  
  // New contact detection
  if (isNewContact) {
    return {
      shouldNotify: true,
      eventType: 'new_contact',
      summary: `Primeira mensagem: "${messageContent.substring(0, 80)}${messageContent.length > 80 ? '...' : ''}"`,
      urgency: 'low'
    };
  }
  
  return {
    shouldNotify: false,
    eventType: 'new_contact',
    summary: '',
    urgency: 'low'
  };
}

/**
 * Send owner notification via edge function (fire and forget)
 */
async function sendOwnerNotification(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  eventType: NotificationEventType,
  contactPhone: string,
  contactName: string | null,
  summary: string,
  conversationId: string,
  instanceId: string,
  urgency: 'low' | 'medium' | 'high'
): Promise<void> {
  try {
    console.log(`[Inbox Webhook] Triggering owner notification: ${eventType}`);
    
    await fetch(`${supabaseUrl}/functions/v1/send-owner-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        userId,
        eventType,
        contactPhone,
        contactName,
        summary,
        conversationId,
        instanceId,
        urgency
      })
    });
  } catch (e) {
    console.error('[Inbox Webhook] Error sending owner notification:', e);
  }
}

/**
 * Detect country code from phone number
 * Returns ISO 2-letter country code (e.g., 'US', 'BR', 'UK')
 */
function detectCountryCode(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  
  // Country code mappings (prefix -> ISO code)
  const countryPrefixes: [string, string][] = [
    ['55', 'BR'],   // Brazil
    ['1', 'US'],    // USA/Canada (we'll use US as default)
    ['44', 'GB'],   // United Kingdom
    ['351', 'PT'],  // Portugal
    ['34', 'ES'],   // Spain
    ['33', 'FR'],   // France
    ['49', 'DE'],   // Germany
    ['39', 'IT'],   // Italy
    ['54', 'AR'],   // Argentina
    ['56', 'CL'],   // Chile
    ['57', 'CO'],   // Colombia
    ['58', 'VE'],   // Venezuela
    ['52', 'MX'],   // Mexico
    ['51', 'PE'],   // Peru
    ['591', 'BO'], // Bolivia
    ['595', 'PY'], // Paraguay
    ['598', 'UY'], // Uruguay
    ['593', 'EC'], // Ecuador
    ['353', 'IE'], // Ireland
    ['31', 'NL'],  // Netherlands
    ['32', 'BE'],  // Belgium
    ['41', 'CH'],  // Switzerland
    ['43', 'AT'],  // Austria
    ['48', 'PL'],  // Poland
    ['81', 'JP'],  // Japan
    ['86', 'CN'],  // China
    ['91', 'IN'],  // India (only if 12+ digits)
    ['61', 'AU'],  // Australia
    ['64', 'NZ'],  // New Zealand
    ['27', 'ZA'],  // South Africa
    ['971', 'AE'], // UAE
    ['972', 'IL'], // Israel
    ['966', 'SA'], // Saudi Arabia
  ];

  // For numbers with 12+ digits, check longer prefixes first
  if (cleaned.length >= 12) {
    for (const [prefix, code] of countryPrefixes) {
      if (cleaned.startsWith(prefix)) {
        return code;
      }
    }
  }
  
  // For 11-digit numbers starting with 1 (USA/Canada)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const areaCode = cleaned.substring(1, 4);
    if (!areaCode.startsWith('0') && !areaCode.startsWith('1')) {
      return 'US';
    }
  }
  
  // For numbers starting with common international prefixes
  for (const [prefix, code] of countryPrefixes) {
    if (prefix !== '1' && cleaned.startsWith(prefix) && cleaned.length >= 10) {
      return code;
    }
  }
  
  // Default to Brazil for 10-11 digit numbers without recognized prefix
  if (cleaned.length >= 10 && cleaned.length <= 11) {
    return 'BR';
  }
  
  return null;
}

/**
 * Format phone number for WhatsApp API - supports international numbers
 */
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length >= 12) return cleaned;
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const areaCode = cleaned.substring(1, 4);
    if (!areaCode.startsWith('0') && !areaCode.startsWith('1')) {
      return cleaned;
    }
  }
  
  const internationalPrefixes = ['44', '351', '54', '56', '57', '58', '34', '33', '49', '39'];
  for (const prefix of internationalPrefixes) {
    if (cleaned.startsWith(prefix) && cleaned.length >= 10 + prefix.length - 1) {
      return cleaned;
    }
  }
  
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

// Fetch contact avatar from UAZAPI
async function fetchContactAvatar(
  uazapiUrl: string,
  instanceKey: string,
  phone: string
): Promise<string | null> {
  try {
    console.log(`[Avatar] Fetching avatar for phone: ${phone}`);
    
    const response = await fetch(`${uazapiUrl}/user/avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceKey
      },
      body: JSON.stringify({
        Phone: phone,
        Preview: false // false = full resolution
      })
    });

    if (response.ok) {
      const data = await response.json();
      const avatarUrl = data.url || data.URL || data.imgUrl || data.profilePicUrl || data.avatar || null;
      console.log(`[Avatar] Result for ${phone}:`, avatarUrl ? 'found' : 'not found');
      return avatarUrl;
    }
    
    console.log(`[Avatar] Failed to fetch for ${phone}, status:`, response.status);
    return null;
  } catch (error) {
    console.log('[Avatar] Error fetching:', error);
    return null;
  }
}

// Standard format from our internal calls
interface IncomingMessage {
  phone: string;
  message: string;
  instanceKey?: string;
  instanceId?: string;
  contactName?: string;
  mediaUrl?: string;
  mediaType?: string;
  messageId?: string;
}

// UAZAPI webhook format (v2 with EventType)
interface UAZAPIWebhookPayload {
  EventType?: string;  // "messages" with capital E
  event?: string;      // fallback lowercase
  instance?: string;
  instanceName?: string;
  token?: string;
  // UAZAPI v2 format - message object at root level
  message?: {
    chatid?: string;
    sender_pn?: string;  // "559187459963@s.whatsapp.net"
    senderName?: string;
    text?: string;
    fromMe?: boolean;
    isGroup?: boolean;
    content?: { text?: string };
    id?: string;
    messageid?: string;  // Alternative ID field
    // Media fields
    hasMedia?: boolean;
    mediaType?: string;
    mediaUrl?: string;
    caption?: string;
    mimetype?: string;
    fileName?: string;
    messageType?: string;  // "ImageMessage", "VideoMessage", "AudioMessage", etc.
  };
  // Legacy UAZAPI format with data wrapper
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: { caption?: string; url?: string; mimetype?: string };
      videoMessage?: { caption?: string; url?: string; mimetype?: string };
      audioMessage?: { url?: string; mimetype?: string };
      documentMessage?: { fileName?: string; url?: string; mimetype?: string };
      stickerMessage?: { url?: string; mimetype?: string };
    };
    pushName?: string;
    messageTimestamp?: number;
  };
  // Message status update fields (for delivery/read receipts)
  ack?: number;  // 0=pending, 1=sent, 2=delivered, 3=read
  id?: string;   // message ID for status updates
  // Alternative fields that UAZAPI might send
  phone?: string;
  from?: string;
  text?: string;
  name?: string;
  remoteJid?: string;
  pushName?: string;
}

// Download media from UAZAPI using /message/download endpoint
async function downloadMediaFromUAZAPI(
  uazapiUrl: string,
  instanceKey: string,
  messageId: string,
  mediaType: string
): Promise<{ fileUrl: string | null; mimetype: string | null }> {
  try {
    console.log(`[Media Download] Downloading media for message: ${messageId}, type: ${mediaType}`);
    
    const response = await fetch(`${uazapiUrl}/message/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceKey
      },
      body: JSON.stringify({
        id: messageId,
        return_link: true,        // Returns public URL
        return_base64: false,     // Don't need base64
        generate_mp3: mediaType === 'audio' || mediaType === 'ptt',  // Convert audio to MP3
        download_quoted: false    // Don't download quoted media
      })
    });

    if (!response.ok) {
      console.error(`[Media Download] Failed with status: ${response.status}`);
      const errorText = await response.text();
      console.error(`[Media Download] Error response: ${errorText}`);
      return { fileUrl: null, mimetype: null };
    }

    const data = await response.json();
    console.log(`[Media Download] Response:`, JSON.stringify(data));
    
    // UAZAPI returns: { fileURL, mimetype, base64Data?, transcription? }
    const fileUrl = data.fileURL || data.url || data.link || data.fileUrl || null;
    const mimetype = data.mimetype || data.mimeType || null;
    
    if (fileUrl) {
      console.log(`[Media Download] Success: ${fileUrl.substring(0, 80)}...`);
    } else {
      console.log(`[Media Download] No URL in response`);
    }
    
    return { fileUrl, mimetype };
  } catch (error) {
    console.error('[Media Download] Error:', error);
    return { fileUrl: null, mimetype: null };
  }
}

// Map simple media type to proper MIME type
function mapMediaTypeToMime(mediaType: string | undefined, mimetype: string | undefined): string | undefined {
  if (mimetype) return mimetype;
  if (!mediaType) return undefined;
  
  const mimeMap: Record<string, string> = {
    'image': 'image/jpeg',
    'video': 'video/mp4',
    'audio': 'audio/mpeg',
    'ptt': 'audio/ogg',  // Push-to-talk (voice messages)
    'document': 'application/octet-stream',
    'sticker': 'image/webp'
  };
  
  return mimeMap[mediaType] || undefined;
}

// Get preview label for media messages
function getMediaPreviewLabel(mediaType: string | undefined, caption: string | undefined): string {
  if (caption) return caption.substring(0, 100);
  
  const labels: Record<string, string> = {
    'image': '📷 Imagem',
    'video': '🎥 Vídeo',
    'audio': '🎵 Áudio',
    'ptt': '🎤 Áudio',
    'document': '📄 Documento',
    'sticker': '🩹 Sticker'
  };
  
  return labels[mediaType || ''] || '📎 Anexo';
}

interface ExtractedMessageData {
  phone: string;
  message: string;
  contactName: string;
  mediaUrl?: string;
  mediaType?: string;
  messageId?: string;
  hasMedia?: boolean;
  mimetype?: string;
  caption?: string;
  fromMe?: boolean;  // Indicates if message was sent by us (from device or system)
}

function extractMessageData(body: UAZAPIWebhookPayload): ExtractedMessageData | null {
  // Try UAZAPI v2 format first (EventType + message object)
  if ((body.EventType === 'messages' || body.event === 'messages') && body.message && typeof body.message === 'object') {
    const msgObj = body.message;
    
    // Capture fromMe flag - we now process both incoming and outgoing messages
    const fromMe = msgObj.fromMe === true;
    
    // Skip group messages for now (Central de Atendimento focuses on 1:1 conversations)
    if (msgObj.isGroup) {
      console.log("[Inbox Webhook] Skipping group message");
      return null;
    }
    
    // Extract phone from sender_pn or chatid (for outgoing messages, use chatid)
    let phone = '';
    if (fromMe) {
      // For outgoing messages, extract destination from chatid
      phone = msgObj.chatid?.replace('@s.whatsapp.net', '').replace('@g.us', '') || '';
    } else {
      // For incoming messages, use sender_pn
      phone = msgObj.sender_pn?.replace('@s.whatsapp.net', '').replace('@g.us', '') || '';
    }
    
    // Extract message text (use caption for media messages)
    const message = msgObj.text || msgObj.content?.text || msgObj.caption || '';
    
    // Extract contact name
    const contactName = msgObj.senderName || phone;
    
    // Extract message ID for media download
    const messageId = msgObj.id || msgObj.messageid;
    
    // Extract media info - UAZAPI v2 uses messageType instead of hasMedia
    const messageType = msgObj.messageType || '';
    const mediaMessageTypes = ['ImageMessage', 'VideoMessage', 'AudioMessage', 'DocumentMessage', 'StickerMessage', 'PttMessage'];
    const hasMediaByType = mediaMessageTypes.some(type => 
      messageType.toLowerCase().includes(type.toLowerCase().replace('message', ''))
    );
    
    // Check for media: messageType OR hasMedia flag OR non-empty mediaType
    const hasMedia = hasMediaByType || msgObj.hasMedia === true || (!!msgObj.mediaType && msgObj.mediaType !== '');
    
    let mediaUrl: string | undefined = msgObj.mediaUrl;
    
    // Infer mediaType from messageType if not explicitly provided
    let mediaType: string | undefined = msgObj.mediaType;
    if (!mediaType && hasMediaByType) {
      if (messageType.toLowerCase().includes('image')) mediaType = 'image';
      else if (messageType.toLowerCase().includes('video')) mediaType = 'video';
      else if (messageType.toLowerCase().includes('audio') || messageType.toLowerCase().includes('ptt')) mediaType = 'audio';
      else if (messageType.toLowerCase().includes('document')) mediaType = 'document';
      else if (messageType.toLowerCase().includes('sticker')) mediaType = 'sticker';
    }
    
    const mimetype: string | undefined = msgObj.mimetype;
    const caption: string | undefined = msgObj.caption;
    
    console.log(`[Inbox Webhook] UAZAPI v2 format detected:`);
    console.log(`[Inbox Webhook]   - phone: ${phone}`);
    console.log(`[Inbox Webhook]   - fromMe: ${fromMe}`);
    console.log(`[Inbox Webhook]   - messageType: ${messageType}`);
    console.log(`[Inbox Webhook]   - hasMedia: ${hasMedia}`);
    console.log(`[Inbox Webhook]   - mediaType: ${mediaType}`);
    console.log(`[Inbox Webhook]   - messageId: ${messageId}`);
    
    return { phone, message, contactName, mediaUrl, mediaType, messageId, hasMedia, mimetype, caption, fromMe };
  }
  
  // Try legacy UAZAPI webhook format with data wrapper
  if (body.data?.key?.remoteJid) {
    const remoteJid = body.data.key.remoteJid;
    // Capture fromMe flag - we now process both incoming and outgoing messages
    const fromMe = body.data.key.fromMe === true;
    
    // Extract phone from remoteJid (format: 5591999999999@s.whatsapp.net)
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    
    // Extract message ID
    const messageId = body.data.key.id;
    
    // Extract message content from various message types
    const msgData = body.data.message;
    let message = '';
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    let mimetype: string | undefined;
    let hasMedia = false;
    let caption: string | undefined;
    
    if (msgData?.conversation) {
      message = msgData.conversation;
    } else if (msgData?.extendedTextMessage?.text) {
      message = msgData.extendedTextMessage.text;
    } else if (msgData?.imageMessage) {
      caption = msgData.imageMessage.caption;
      message = caption || '';
      mediaUrl = msgData.imageMessage.url;
      mediaType = 'image';
      mimetype = msgData.imageMessage.mimetype;
      hasMedia = true;
    } else if (msgData?.videoMessage) {
      caption = msgData.videoMessage.caption;
      message = caption || '';
      mediaUrl = msgData.videoMessage.url;
      mediaType = 'video';
      mimetype = msgData.videoMessage.mimetype;
      hasMedia = true;
    } else if (msgData?.audioMessage) {
      message = '';
      mediaUrl = msgData.audioMessage.url;
      mediaType = 'audio';
      mimetype = msgData.audioMessage.mimetype;
      hasMedia = true;
    } else if (msgData?.documentMessage) {
      message = msgData.documentMessage.fileName || '';
      mediaUrl = msgData.documentMessage.url;
      mediaType = 'document';
      mimetype = msgData.documentMessage.mimetype;
      hasMedia = true;
    } else if (msgData?.stickerMessage) {
      message = '';
      mediaUrl = msgData.stickerMessage.url;
      mediaType = 'sticker';
      mimetype = msgData.stickerMessage.mimetype;
      hasMedia = true;
    }
    
    const contactName = body.data.pushName || phone;
    
    console.log(`[Inbox Webhook] Legacy UAZAPI format detected - phone: ${phone}, fromMe: ${fromMe}, hasMedia: ${hasMedia}`);
    return { phone, message, contactName, mediaUrl, mediaType, messageId, hasMedia, mimetype, caption, fromMe };
  }
  
  // Try alternative UAZAPI formats
  if (body.remoteJid) {
    const phone = body.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const message = body.text || '';
    const contactName = body.pushName || body.name || phone;
    return { phone, message, contactName };
  }
  
  // Try direct fields (phone + message as strings)
  if (body.phone && typeof body.phone === 'string') {
    const textMessage = body.text || '';
    return {
      phone: body.phone.replace(/\D/g, ''),
      message: textMessage,
      contactName: body.name || body.phone
    };
  }
  
  if (body.from) {
    return {
      phone: body.from.replace(/\D/g, '').replace('@s.whatsapp.net', ''),
      message: body.text || '',
      contactName: body.name || body.from
    };
  }
  
  return null;
}

// Handle message status updates (delivery/read receipts)
// deno-lint-ignore no-explicit-any
async function handleMessageStatusUpdate(supabase: any, body: UAZAPIWebhookPayload & { message?: { ack?: number; messageid?: string; chatid?: string }; data?: { ack?: number; status?: string } }) {
  try {
    console.log(`[Status Handler] Starting status update processing...`);
    
    // Extract message ID and status from various UAZAPI formats
    let messageId: string | undefined;
    let ackStatus: number | undefined;
    let phone: string | undefined;
    
    // UAZAPI v2 format - try multiple possible locations for message ID
    if (body.message?.messageid) {
      messageId = body.message.messageid;
    } else if (body.message?.id) {
      messageId = body.message.id;
    } else if (body.id) {
      messageId = body.id;
    } else if (body.data?.key?.id) {
      messageId = body.data.key.id;
    }
    
    // UAZAPI v2 may send with instance:id format - extract just the ID part
    if (messageId?.includes(':')) {
      const parts = messageId.split(':');
      messageId = parts.pop();
      console.log(`[Status Handler] Extracted ID from composite: ${messageId}`);
    }
    
    // Get ack status (0=pending, 1=sent, 2=delivered, 3=read)
    // Try multiple locations for ACK value
    if (typeof body.ack === 'number') {
      ackStatus = body.ack;
      console.log(`[Status Handler] Found ack at body.ack: ${ackStatus}`);
    } else if (typeof body.message?.ack === 'number') {
      ackStatus = body.message.ack;
      console.log(`[Status Handler] Found ack at body.message.ack: ${ackStatus}`);
    } else if (typeof body.data?.ack === 'number') {
      ackStatus = body.data.ack;
      console.log(`[Status Handler] Found ack at body.data.ack: ${ackStatus}`);
    } else if (body.data?.status) {
      // Handle string status values
      const statusToAck: Record<string, number> = {
        'pending': 0, 'sending': 0,
        'sent': 1, 'server': 1,
        'delivered': 2, 'device': 2,
        'read': 3, 'played': 3
      };
      const statusStr = body.data.status.toLowerCase();
      if (statusStr in statusToAck) {
        ackStatus = statusToAck[statusStr];
        console.log(`[Status Handler] Converted status string '${statusStr}' to ack: ${ackStatus}`);
      }
    }
    
    // Get phone for matching - try multiple formats
    if (body.message?.chatid) {
      phone = body.message.chatid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    } else if (body.message?.sender_pn) {
      phone = body.message.sender_pn.replace('@s.whatsapp.net', '').replace('@g.us', '');
    } else if (body.data?.key?.remoteJid) {
      phone = body.data.key.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    } else if (body.phone) {
      phone = body.phone.replace(/\D/g, '');
    } else if (body.remoteJid) {
      phone = body.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    }
    
    console.log(`[Status Handler] Extracted values:`);
    console.log(`[Status Handler]   - Message ID: ${messageId || 'NOT FOUND'}`);
    console.log(`[Status Handler]   - ACK status: ${ackStatus ?? 'NOT FOUND'}`);
    console.log(`[Status Handler]   - Phone: ${phone || 'NOT FOUND'}`);
    
    if (!phone && !messageId) {
      console.log('[Status Handler] ERROR: No identifier found for status update - cannot proceed');
      return;
    }
    
    // Map ack to status string
    const statusMap: Record<number, string> = {
      0: 'sending',
      1: 'sent',
      2: 'delivered',
      3: 'read'
    };
    
    const newStatus = ackStatus !== undefined ? statusMap[ackStatus] : undefined;
    
    if (!newStatus) {
      console.log(`[Status Handler] ERROR: Unknown or missing ack status: ${ackStatus}`);
      return;
    }
    
    console.log(`[Status Handler] Will update to status: ${newStatus} (ACK=${ackStatus})`);
    
    // Find and update the message
    // First try by message ID in metadata
    if (messageId) {
      console.log(`[Status Handler] Searching for message with whatsapp_id: ${messageId}`);
      
      const { data: messages, error } = await supabase
        .from('chat_inbox_messages')
        .select('id, metadata, conversation_id')
        .eq('sender_type', 'agent')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error(`[Status Handler] Database error fetching messages:`, error);
      } else if (messages) {
        console.log(`[Status Handler] Found ${messages.length} agent messages to search`);
        
        // Find message by ID in metadata
        // deno-lint-ignore no-explicit-any
        const matchingMessage = messages.find((m: any) => 
          m.metadata?.whatsapp_id === messageId
        );
        
        if (matchingMessage) {
          const currentStatus = matchingMessage.metadata?.status;
          const statusOrder: Record<string, number> = { sending: 0, sent: 1, delivered: 2, read: 3 };
          const currentOrder = statusOrder[currentStatus as string] ?? -1;
          const newOrder = statusOrder[newStatus] ?? -1;
          
          console.log(`[Status Handler] Found matching message ${matchingMessage.id}`);
          console.log(`[Status Handler] Current status: ${currentStatus} (order=${currentOrder}), New status: ${newStatus} (order=${newOrder})`);
          
          if (newOrder > currentOrder) {
            const { error: updateError } = await supabase
              .from('chat_inbox_messages')
              .update({
                metadata: {
                  ...matchingMessage.metadata,
                  status: newStatus,
                  status_updated_at: new Date().toISOString()
                },
                is_read: newStatus === 'read'
              })
              .eq('id', matchingMessage.id);
            
            if (updateError) {
              console.error(`[Status Handler] Update error:`, updateError);
            } else {
              console.log(`[Status Handler] ✅ SUCCESS: Updated message ${matchingMessage.id} from ${currentStatus} to ${newStatus}`);
            }
          } else {
            console.log(`[Status Handler] Skipping update - new status not higher than current`);
          }
          return;
        } else {
          console.log(`[Status Handler] No message found with whatsapp_id: ${messageId}`);
        }
      }
    }
    
    // Fallback: Update most recent outgoing message to this phone
    if (phone) {
      console.log(`[Status Handler] Fallback: Searching by phone ${phone}`);
      
      // Find conversation by phone
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('phone', phone);
      
      if (convError) {
        console.error(`[Status Handler] Error finding conversations:`, convError);
      } else if (conversations && conversations.length > 0) {
        // deno-lint-ignore no-explicit-any
        const conversationIds = conversations.map((c: any) => c.id);
        console.log(`[Status Handler] Found ${conversations.length} conversations for phone ${phone}`);
        
        // Get most recent outgoing messages (get more to increase chances of match)
        const { data: recentMessages, error: msgError } = await supabase
          .from('chat_inbox_messages')
          .select('id, metadata, created_at')
          .in('conversation_id', conversationIds)
          .eq('sender_type', 'agent')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (msgError) {
          console.error(`[Status Handler] Error fetching recent messages:`, msgError);
        } else if (recentMessages && recentMessages.length > 0) {
          console.log(`[Status Handler] Found ${recentMessages.length} recent agent messages`);
          
          // Update the most recent one that hasn't reached this status yet
          for (const msg of recentMessages) {
            const currentStatus = msg.metadata?.status;
            const statusOrder: Record<string, number> = { sending: 0, sent: 1, delivered: 2, read: 3 };
            const currentOrder = statusOrder[currentStatus as string] ?? -1;
            const newOrder = statusOrder[newStatus] ?? -1;
            
            if (newOrder > currentOrder) {
              const { error: updateError } = await supabase
                .from('chat_inbox_messages')
                .update({
                  metadata: {
                    ...msg.metadata,
                    status: newStatus,
                    status_updated_at: new Date().toISOString()
                  },
                  is_read: newStatus === 'read'
                })
                .eq('id', msg.id);
              
              if (updateError) {
                console.error(`[Status Handler] Update error:`, updateError);
              } else {
                console.log(`[Status Handler] ✅ SUCCESS: Updated recent message ${msg.id} from ${currentStatus} to ${newStatus}`);
              }
              break; // Only update the first matching message
            }
          }
        } else {
          console.log(`[Status Handler] No recent agent messages found for these conversations`);
        }
      } else {
        console.log(`[Status Handler] No conversations found for phone ${phone}`);
      }
    }
  } catch (error) {
    console.error('[Status Handler] CRITICAL ERROR:', error);
  }
}

serve(async (req: Request) => {
  const requestTimestamp = new Date().toISOString();
  console.log(`[Inbox Webhook] ========== REQUEST RECEIVED at ${requestTimestamp} ==========`);
  
  if (req.method === 'OPTIONS') {
    console.log("[Inbox Webhook] Handling OPTIONS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  // Log request details for debugging
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    requestHeaders[key] = value;
  });
  console.log("[Inbox Webhook] Method:", req.method);
  console.log("[Inbox Webhook] Headers:", JSON.stringify(requestHeaders));

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const uazapiUrl = Deno.env.get('UAZAPI_URL')!;
    const uazapiToken = Deno.env.get('UAZAPI_TOKEN')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    console.log("[Inbox Webhook] Raw body:", rawBody);
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("[Inbox Webhook] Failed to parse JSON body:", parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', received: rawBody.substring(0, 500) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log("[Inbox Webhook] Parsed payload:", JSON.stringify(body));
    console.log("[Inbox Webhook] Event type:", body.event || 'not specified');
    console.log("[Inbox Webhook] Instance/Token:", body.instance || body.token || 'not specified');

    // Check if this is a message status update event (delivery/read receipts)
    const eventType = body.EventType || body.event;
    
    // Expanded list of status events for UAZAPI v2
    const statusEvents = [
      'message_ack', 
      'ack', 
      'message.ack', 
      'messages.ack', 
      'status',
      'message.update',      // UAZAPI v2
      'messages.update',     // UAZAPI v2
      'message_update',      // Alternative format
      'acks',                // Alternative format
      'MessageAck',          // UAZAPI v2 PascalCase
      'message.status',      // Alternative v2 format
      'messages.status',     // Alternative v2 format
      'MessageUpdate',       // PascalCase v2
      'message-ack',         // kebab-case
      'message-update',      // kebab-case
      'receipt',             // Common name for read receipts
      'read',                // Direct read event
      'delivered'            // Direct delivered event
    ];
    const isStatusEvent = eventType && statusEvents.includes(eventType);
    
    // Also check for inline ACK in the message payload (various locations)
    const hasInlineAck = typeof body.ack === 'number' || 
                         body.message?.ack !== undefined || 
                         body.data?.ack !== undefined ||
                         body.data?.status !== undefined;
    
    // Check if this is an outgoing message with ACK info (fromMe=true with ack)
    const isOutgoingWithAck = body.message?.fromMe === true && body.message?.ack !== undefined;
    
    console.log(`[Inbox Webhook] Event detection:`);
    console.log(`[Inbox Webhook]   - EventType: ${eventType}`);
    console.log(`[Inbox Webhook]   - isStatusEvent: ${isStatusEvent}`);
    console.log(`[Inbox Webhook]   - hasInlineAck: ${hasInlineAck}`);
    console.log(`[Inbox Webhook]   - isOutgoingWithAck: ${isOutgoingWithAck}`);
    
    if (isStatusEvent || hasInlineAck || isOutgoingWithAck) {
      console.log(`[Inbox Webhook] === STATUS UPDATE DETECTED ===`);
      console.log(`[Inbox Webhook] EventType: ${eventType}`);
      console.log(`[Inbox Webhook] ACK sources: body.ack=${body.ack}, message.ack=${body.message?.ack}, data.ack=${body.data?.ack}`);
      console.log(`[Inbox Webhook] Message ID sources: id=${body.id}, message.id=${body.message?.id}, message.messageid=${body.message?.messageid}`);
      console.log(`[Inbox Webhook] Full payload: ${JSON.stringify(body)}`);
      
      await handleMessageStatusUpdate(supabase, body);
      return new Response(
        JSON.stringify({ success: true, event: eventType || 'inline_ack', type: 'status_update' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a non-message event (qrcode, connection, etc.)
    // Accept multiple event names for messages - including EventType (UAZAPI v2)
    const messageEvents = ['messages', 'message', 'messages.upsert', 'MESSAGES_UPSERT'];
    const isMessageEvent = !eventType || messageEvents.includes(eventType);
    
    if (!isMessageEvent) {
      console.log(`[Inbox Webhook] Ignoring non-message event type: ${eventType}`);
      return new Response(
        JSON.stringify({ success: true, ignored: true, event: eventType, timestamp: requestTimestamp }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[Inbox Webhook] Processing message event: ${eventType || 'default'}`);

    // Extract message data from various formats
    const extractedData = extractMessageData(body);
    
    // Also check for standard format
    const standardFormat = body as IncomingMessage;
    
    let phone: string;
    let message: string;
    let instanceKey: string | undefined;
    let instanceId: string | undefined;
    let contactName: string;
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    let messageId: string | undefined;
    let hasMedia = false;
    let mimetype: string | undefined;
    let caption: string | undefined;

    let fromMe = false;  // Track if message is from us (device or system)

    if (extractedData) {
      // UAZAPI format
      phone = extractedData.phone;
      message = extractedData.message;
      contactName = extractedData.contactName;
      mediaUrl = extractedData.mediaUrl;
      mediaType = extractedData.mediaType;
      instanceKey = body.token || body.instance;
      messageId = extractedData.messageId;
      hasMedia = extractedData.hasMedia || false;
      mimetype = extractedData.mimetype;
      caption = extractedData.caption;
      fromMe = extractedData.fromMe || false;
    } else if (standardFormat.phone && standardFormat.message) {
      // Standard format from our internal calls
      phone = standardFormat.phone;
      message = standardFormat.message;
      instanceKey = standardFormat.instanceKey;
      instanceId = standardFormat.instanceId;
      contactName = standardFormat.contactName || phone;
      mediaUrl = standardFormat.mediaUrl;
      mediaType = standardFormat.mediaType;
    } else {
      console.log("[Inbox Webhook] Could not extract message data from payload");
      return new Response(
        JSON.stringify({ error: 'Could not parse message data', received: body }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Inbox Webhook] Received message from: ${phone}, instanceKey: ${instanceKey || 'none'}, hasMedia: ${hasMedia}, messageId: ${messageId}, fromMe: ${fromMe}`);

    // For messages with media, we need either a URL or phone/message content
    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'phone is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If message is empty but has media, that's okay - we'll show media preview
    if (!message && !hasMedia) {
      return new Response(
        JSON.stringify({ error: 'message or media is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the instance
    let instanceQuery = supabase.from('whatsapp_instances').select('*');
    
    if (instanceId) {
      instanceQuery = instanceQuery.eq('id', instanceId);
    } else if (instanceKey) {
      instanceQuery = instanceQuery.eq('instance_key', instanceKey);
    } else {
      return new Response(
        JSON.stringify({ error: 'instanceKey or instanceId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: instance, error: instanceError } = await instanceQuery.single();

    if (instanceError || !instance) {
      console.error('[Inbox Webhook] Instance not found:', instanceError);
      return new Response(
        JSON.stringify({ error: 'WhatsApp instance not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Inbox Webhook] Found instance: ${instance.instance_name}`);

    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '');

    // === DOWNLOAD MEDIA IF NEEDED ===
    // If message has media but no URL, download from UAZAPI
    if (hasMedia && !mediaUrl && messageId && instance.instance_key) {
      console.log(`[Inbox Webhook] Message has media but no URL, downloading via /message/download...`);
      
      const { fileUrl, mimetype: downloadedMimetype } = await downloadMediaFromUAZAPI(
        uazapiUrl,
        instance.instance_key,
        messageId,
        mediaType || 'unknown'
      );
      
      if (fileUrl) {
        mediaUrl = fileUrl;
        console.log(`[Inbox Webhook] Media downloaded successfully: ${mediaUrl.substring(0, 80)}...`);
        
        // Determine media type from mimetype if not set
        if (!mediaType && downloadedMimetype) {
          if (downloadedMimetype.startsWith('image/')) mediaType = 'image';
          else if (downloadedMimetype.startsWith('video/')) mediaType = 'video';
          else if (downloadedMimetype.startsWith('audio/')) mediaType = 'audio';
          else mediaType = 'document';
        }
        
        // Update mimetype if downloaded
        if (downloadedMimetype) {
          mimetype = downloadedMimetype;
        }
      } else {
        console.log(`[Inbox Webhook] Failed to download media, saving message without media URL`);
      }
    }

    // Determine final media type for database (use proper MIME type)
    const finalMediaType = mapMediaTypeToMime(mediaType, mimetype);
    
    // Create preview message for media
    const previewMessage = message || (hasMedia ? getMediaPreviewLabel(mediaType, caption) : '');

    // Find or create conversation
    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('instance_id', instance.id)
      .eq('phone', normalizedPhone)
      .single();

    if (convError && convError.code !== 'PGRST116') {
      console.error('[Inbox Webhook] Error fetching conversation:', convError);
    }

    if (!conversation) {
      // Fetch avatar before creating conversation
      let contactAvatar: string | null = null;
      const uazapiUrl = Deno.env.get("UAZAPI_URL") || "https://zynk2.uazapi.com";
      
      if (instance.instance_key) {
        contactAvatar = await fetchContactAvatar(uazapiUrl, instance.instance_key, normalizedPhone);
      }

      // Detect country code from phone number
      const countryCode = detectCountryCode(normalizedPhone);
      console.log(`[Inbox Webhook] Detected country code for ${normalizedPhone}: ${countryCode}`);

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          instance_id: instance.id,
          user_id: instance.user_id,
          phone: normalizedPhone,
          contact_name: contactName || normalizedPhone,
          contact_avatar: contactAvatar,
          country_code: countryCode,
          status: 'open',
          ai_enabled: true,
          unread_count: 1,
          last_message_at: new Date().toISOString(),
          last_message_preview: previewMessage.substring(0, 100)
        })
        .select()
        .single();

      if (createError) {
        console.error('[Inbox Webhook] Error creating conversation:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create conversation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      conversation = newConv;
      console.log(`[Inbox Webhook] Created new conversation: ${conversation.id}`);
    } else {
      // Update existing conversation
      // For outgoing messages (fromMe), don't increment unread_count
      const updateData: Record<string, unknown> = {
        last_message_at: new Date().toISOString(),
        last_message_preview: previewMessage.substring(0, 100),
      };
      
      // Only update these for incoming messages
      if (!fromMe) {
        updateData.status = conversation.status === 'resolved' ? 'open' : conversation.status;
        updateData.unread_count = (conversation.unread_count || 0) + 1;
        updateData.contact_name = contactName || conversation.contact_name;
      }
      
      const { error: updateError } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversation.id);

      if (updateError) {
        console.error('[Inbox Webhook] Error updating conversation:', updateError);
      }
      console.log(`[Inbox Webhook] Updated conversation: ${conversation.id}, fromMe: ${fromMe}`);
    }

    // Check if this outgoing message already exists (avoid duplicates for messages sent via system)
    if (fromMe) {
      console.log(`[Inbox Webhook] Checking for duplicate outgoing message. messageId: ${messageId}, content: "${(message || previewMessage).substring(0, 50)}..."`);
      
      // Extract short ID (without instance prefix) for flexible matching
      const messageIdShort = messageId?.includes(':') ? messageId.split(':').pop() : messageId;
      
      // Fetch recent agent messages for this conversation (last 60 seconds)
      const { data: existingMsgs, error: dupError } = await supabase
        .from('chat_inbox_messages')
        .select('id, metadata, content, created_at')
        .eq('conversation_id', conversation.id)
        .eq('sender_type', 'agent')
        .gte('created_at', new Date(Date.now() - 60000).toISOString())
        .order('created_at', { ascending: false })
        .limit(15);
      
      if (dupError) {
        console.error(`[Inbox Webhook] Error checking duplicates:`, dupError);
      }
      
      if (existingMsgs && existingMsgs.length > 0) {
        console.log(`[Inbox Webhook] Found ${existingMsgs.length} recent agent messages to check`);
        
        // Check for duplicate by whatsapp_id (flexible matching)
        const duplicateById = messageId ? existingMsgs.find(msg => {
          const meta = msg.metadata as Record<string, unknown> | null;
          const savedId = meta?.whatsapp_id || meta?.whatsapp_message_id;
          if (!savedId) return false;
          
          const savedIdStr = String(savedId);
          const savedIdShort = savedIdStr.includes(':') ? savedIdStr.split(':').pop() : savedIdStr;
          
          // Match full ID, short ID, or partial match
          const isMatch = savedIdStr === messageId || 
                         savedIdShort === messageIdShort || 
                         (messageIdShort && savedIdStr.includes(messageIdShort)) ||
                         (messageIdShort && savedIdShort === messageIdShort);
          
          if (isMatch) {
            console.log(`[Inbox Webhook] ID match found: saved="${savedIdStr}" vs incoming="${messageId}"`);
          }
          return isMatch;
        }) : null;
        
        if (duplicateById) {
          console.log(`[Inbox Webhook] ✓ Duplicate by ID found (msg.id: ${duplicateById.id}), skipping`);
          return new Response(
            JSON.stringify({
              success: true,
              conversationId: conversation.id,
              messageId: duplicateById.id,
              skipped: true,
              reason: 'duplicate_by_whatsapp_id'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Fallback: check for duplicate by content within last 5 seconds
        const contentToMatch = message || previewMessage;
        if (contentToMatch) {
          const fiveSecondsAgo = Date.now() - 5000;
          const duplicateByContent = existingMsgs.find(msg => {
            const msgTime = new Date(msg.created_at).getTime();
            const isRecent = msgTime >= fiveSecondsAgo;
            const isSameContent = msg.content === contentToMatch;
            
            if (isRecent && isSameContent) {
              console.log(`[Inbox Webhook] Content match found: "${msg.content?.substring(0, 30)}..." (${Math.round((Date.now() - msgTime) / 1000)}s ago)`);
            }
            return isRecent && isSameContent;
          });
          
          if (duplicateByContent) {
            console.log(`[Inbox Webhook] ✓ Duplicate by content found (msg.id: ${duplicateByContent.id}), skipping`);
            return new Response(
              JSON.stringify({
                success: true,
                conversationId: conversation.id,
                messageId: duplicateByContent.id,
                skipped: true,
                reason: 'duplicate_by_content'
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
      
      console.log(`[Inbox Webhook] No duplicate found, proceeding with save`);
    }

    // Save message - set sender_type based on fromMe flag
    const senderType = fromMe ? 'agent' : 'contact';
    const messageMetadata: Record<string, unknown> = { 
      phone, 
      original_message: body,
      whatsapp_message_id: messageId,
      whatsapp_id: messageId,  // Also save as whatsapp_id for status updates
      has_media: hasMedia,
      original_media_type: mediaType,
      file_name: caption || undefined
    };
    
    // For outgoing messages (from device), add source indicator and status
    if (fromMe) {
      messageMetadata.source = 'device';  // Indicates sent from phone, not system
      messageMetadata.status = 'sent';
      messageMetadata.sent_by = 'Celular';
    }
    
    const { data: savedMessage, error: msgError } = await supabase
      .from('chat_inbox_messages')
      .insert({
        conversation_id: conversation.id,
        sender_type: senderType,
        sender_id: null,  // null for both incoming and device-sent messages
        content: message || caption || '',
        media_url: mediaUrl,
        media_type: finalMediaType,
        is_read: fromMe,  // Outgoing messages are already read
        metadata: messageMetadata
      })
      .select()
      .single();

    if (msgError) {
      console.error('[Inbox Webhook] Error saving message:', msgError);
    } else {
      console.log(`[Inbox Webhook] Saved ${senderType} message: ${savedMessage.id}`);
    }

    // ===== OWNER NOTIFICATION SYSTEM =====
    // Only trigger for INCOMING messages (not fromMe)
    if (!fromMe && savedMessage) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      
      // Determine if this is a new contact (conversation was just created)
      const isNewContact = !conversation.created_at || 
        (new Date().getTime() - new Date(conversation.created_at).getTime()) < 5000;
      
      // Try to fetch client memory for VIP detection
      let clientMemory: any = null;
      try {
        const { data: memoryData } = await supabase
          .from('ai_client_memories')
          .select('is_vip, client_name')
          .eq('phone', normalizedPhone)
          .eq('user_id', instance.user_id)
          .maybeSingle();
        clientMemory = memoryData;
      } catch (e) {
        // Memory fetch is optional, continue without it
      }
      
      // Detect if this event should trigger a notification
      const detectedEvent = detectNotifiableEvent(
        message || caption || '',
        mediaType,
        isNewContact,
        clientMemory
      );
      
      if (detectedEvent.shouldNotify) {
        // Fire and forget - don't await
        sendOwnerNotification(
          supabaseUrl,
          supabaseServiceKey,
          instance.user_id,
          detectedEvent.eventType,
          normalizedPhone,
          conversation.contact_name,
          detectedEvent.summary,
          conversation.id,
          instance.id,
          detectedEvent.urgency
        );
      }
    }

    // ===== BOT PROXY SYSTEM =====
    // Check if this conversation has bot proxy enabled (via label)
    let botProxyHandled = false;
    
    try {
      // First, check if message is FROM the bot (to forward to client)
      // Try multiple phone formats for matching
      const phoneVariants = [
        normalizedPhone,
        normalizedPhone.replace(/^55/, ''),
        '55' + normalizedPhone.replace(/^55/, '')
      ];
      
      console.log(`[Bot Proxy] Checking if sender is a configured bot. Phone variants:`, phoneVariants);
      
      const { data: proxyConfigByBot } = await supabase
        .from('bot_proxy_config')
        .select('*, trigger_label:inbox_labels(*)')
        .eq('is_active', true)
        .in('bot_phone', phoneVariants)
        .maybeSingle();
      
      if (proxyConfigByBot && !fromMe) {
        // Message is FROM the bot - find the active session to forward to client
        console.log(`[Bot Proxy] Message from bot ${normalizedPhone}, config found:`, proxyConfigByBot.id);
        
        const { data: activeSession, error: sessionError } = await supabase
          .from('bot_proxy_sessions')
          .select('*, config:bot_proxy_config(*)')
          .eq('config_id', proxyConfigByBot.id)
          .eq('is_active', true)
          .order('last_activity_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (sessionError) {
          console.error(`[Bot Proxy] Error fetching session:`, sessionError);
        }
        
        if (activeSession && activeSession.client_conversation_id) {
          console.log(`[Bot Proxy] Found active session for client ${activeSession.client_phone}, session ID: ${activeSession.id}`);
          
          // Update bot_conversation_id if not set
          if (!activeSession.bot_conversation_id) {
            await supabase
              .from('bot_proxy_sessions')
              .update({ 
                bot_conversation_id: conversation.id,
                last_activity_at: new Date().toISOString()
              })
              .eq('id', activeSession.id);
          }
          
          // Get the client conversation first
          const { data: clientConv, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', activeSession.client_conversation_id)
            .single();
          
          if (convError) {
            console.error(`[Bot Proxy] Error fetching client conversation:`, convError);
          }
          
          console.log(`[Bot Proxy] Client conversation found:`, clientConv ? `ID: ${clientConv.id}, instance_id: ${clientConv.instance_id}` : 'NULL');
          
          // Then get the instance separately
          let clientInstance = null;
          if (clientConv && clientConv.instance_id) {
            const { data: instData, error: instError } = await supabase
              .from('whatsapp_instances')
              .select('*')
              .eq('id', clientConv.instance_id)
              .single();
            
            if (instError) {
              console.error(`[Bot Proxy] Error fetching instance:`, instError);
            }
            clientInstance = instData;
          }
          
          console.log(`[Bot Proxy] Instance found:`, clientInstance ? `Key: ${clientInstance.instance_key?.substring(0, 8)}...` : 'NULL');
          
          if (clientConv && clientInstance && clientInstance.instance_key) {
            // Forward message to client
            const clientPhone = formatPhoneNumber(activeSession.client_phone);
            let messageContent = message || caption || '';
            
            console.log(`[Bot Proxy] Original bot message: "${messageContent.substring(0, 100)}..."`);
            
            // ALWAYS apply text replacements FIRST (before any other logic)
            const { data: replacements, error: replError } = await supabase
              .from('bot_proxy_replacements')
              .select('search_text, replace_text')
              .eq('config_id', activeSession.config_id)
              .eq('is_active', true)
              .order('display_order', { ascending: true });
            
            if (replError) {
              console.error(`[Bot Proxy] Error fetching replacements:`, replError);
            }
            
            if (replacements && replacements.length > 0) {
              console.log(`[Bot Proxy] Applying ${replacements.length} text replacement rules`);
              for (const rule of replacements) {
                if (messageContent.includes(rule.search_text)) {
                  console.log(`[Bot Proxy] ✅ Replacing "${rule.search_text}" with "${rule.replace_text}"`);
                  messageContent = messageContent.split(rule.search_text).join(rule.replace_text);
                }
              }
              console.log(`[Bot Proxy] Message after replacements: "${messageContent.substring(0, 150)}..."`);
            }
            
            // Check if this is a payment message that should be blocked and replaced
            const config = activeSession.config || proxyConfigByBot;
            const paymentKeywords = config?.payment_keywords || ['pix', 'pagamento', 'pagar', 'chave pix', 'transferir', 'deposito', 'depositar', 'banco', 'conta', 'R$', 'reais', 'cpf', 'cnpj'];
            const blockBotPayment = config?.block_bot_payment === true;
            const ownerPaymentInfo = config?.owner_payment_info;
            const useMercadoPago = config?.use_mercado_pago === true;
            const mercadoPagoPlanId = config?.mercado_pago_plan_id;
            
            // Check if message contains payment keywords
            const lowerMessage = messageContent.toLowerCase();
            const containsPaymentKeyword = paymentKeywords.some((kw: string) => 
              lowerMessage.includes(kw.toLowerCase())
            );
            
            let skipBotMessage = false;
            
            if (blockBotPayment && containsPaymentKeyword) {
              console.log(`[Bot Proxy] 🚫 Payment message detected! Blocking bot message`);
              console.log(`[Bot Proxy] Blocked message: "${messageContent.substring(0, 100)}..."`);
              
              if (useMercadoPago && mercadoPagoPlanId) {
                // Generate Mercado Pago PIX payment
                console.log(`[Bot Proxy] 💳 Generating Mercado Pago PIX for plan: ${mercadoPagoPlanId}`);
                
                try {
                  // Get plan details
                  const { data: plan } = await supabase
                    .from('subscription_plans')
                    .select('*')
                    .eq('id', mercadoPagoPlanId)
                    .single();
                  
                  if (plan) {
                    const mercadoPagoToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
                    
                    if (mercadoPagoToken) {
                      // Create PIX payment
                      const expirationDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
                      
                      const mpPayload = {
                        transaction_amount: Number(plan.price),
                        description: `${plan.name} - ${plan.duration_months} ${plan.duration_months === 1 ? 'mês' : 'meses'}`,
                        payment_method_id: "pix",
                        payer: {
                          email: "cliente@pagamento.com",
                        },
                        date_of_expiration: expirationDate.toISOString(),
                      };
                      
                      console.log(`[Bot Proxy] Creating MP payment:`, JSON.stringify(mpPayload));
                      
                      const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${mercadoPagoToken}`,
                          "X-Idempotency-Key": `botproxy-${activeSession.id}-${Date.now()}`,
                        },
                        body: JSON.stringify(mpPayload),
                      });
                      
                      const mpData = await mpResponse.json();
                      
                      if (mpResponse.ok && mpData.point_of_interaction?.transaction_data) {
                        const pixData = mpData.point_of_interaction.transaction_data;
                        const pixCode = pixData.qr_code || '';
                        const pixQrCodeBase64 = pixData.qr_code_base64 || '';
                        
                        console.log(`[Bot Proxy] ✅ PIX generated successfully!`);
                        
                        // Send QR Code image first
                        if (pixQrCodeBase64) {
                          const qrImageUrl = `data:image/png;base64,${pixQrCodeBase64}`;
                          
                          // Send image via UAZAPI /send/media
                          await fetch(`${uazapiUrl}/send/media`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'token': clientInstance.instance_key
                            },
                            body: JSON.stringify({
                              number: clientPhone,
                              media: qrImageUrl,
                              type: 'image',
                              caption: `💳 *Pagamento PIX - ${plan.name}*\n\n💰 Valor: R$ ${Number(plan.price).toFixed(2).replace('.', ',')}\n⏰ Válido por 30 minutos`
                            })
                          });
                          
                          console.log(`[Bot Proxy] QR Code image sent`);
                        }
                        
                        // Wait a bit then send the copy-paste code
                        await sleep(1500);
                        
                        const pixMessage = `📋 *Código PIX Copia e Cola:*\n\n\`\`\`${pixCode}\`\`\`\n\n👆 Copie o código acima e cole no seu banco para pagar.`;
                        
                        await sendTextViaUazapi(
                          uazapiUrl,
                          clientInstance.instance_key,
                          clientPhone,
                          pixMessage
                        );
                        
                        console.log(`[Bot Proxy] PIX code sent to client`);
                        skipBotMessage = true;
                        
                        // Save the PIX info in message metadata
                        await supabase
                          .from('chat_inbox_messages')
                          .insert({
                            conversation_id: activeSession.client_conversation_id,
                            sender_type: 'agent',
                            content: `💳 PIX gerado - ${plan.name}: R$ ${Number(plan.price).toFixed(2).replace('.', ',')}`,
                            metadata: { 
                              mercado_pago_payment: true,
                              plan_id: plan.id,
                              plan_name: plan.name,
                              amount: plan.price,
                              pix_code: pixCode.substring(0, 50) + '...',
                              mp_payment_id: mpData.id
                            }
                          });
                      } else {
                        console.error(`[Bot Proxy] MP Error:`, JSON.stringify(mpData));
                        // Fallback to manual payment info
                        if (ownerPaymentInfo) {
                          messageContent = ownerPaymentInfo;
                        }
                      }
                    } else {
                      console.error(`[Bot Proxy] MERCADO_PAGO_ACCESS_TOKEN not configured`);
                      if (ownerPaymentInfo) {
                        messageContent = ownerPaymentInfo;
                      }
                    }
                  }
                } catch (mpError) {
                  console.error(`[Bot Proxy] Error generating MP PIX:`, mpError);
                  // Fallback to manual payment info
                  if (ownerPaymentInfo) {
                    messageContent = ownerPaymentInfo;
                  }
                }
              }
            }
            // Note: Text replacements are already applied above (before payment check)
            
            // Skip sending if PIX was already generated and sent
            if (skipBotMessage) {
              console.log(`[Bot Proxy] Skipping bot message - PIX already sent`);
              
              // Update session activity
              await supabase
                .from('bot_proxy_sessions')
                .update({ last_activity_at: new Date().toISOString() })
                .eq('id', activeSession.id);
              
              // Update client conversation last_message
              await supabase
                .from('conversations')
                .update({
                  last_message_at: new Date().toISOString(),
                  last_message_preview: '💳 PIX enviado'
                })
                .eq('id', activeSession.client_conversation_id);
              
              console.log(`[Bot Proxy] Successfully sent Mercado Pago PIX to client`);
              botProxyHandled = true;
            } else {
              console.log(`[Bot Proxy] Final message to client ${clientPhone}: "${messageContent.substring(0, 100)}..."`);
              
              // Send to client via UAZAPI
              const sendResult = await sendTextViaUazapi(
                uazapiUrl,
                clientInstance.instance_key,
                clientPhone,
                messageContent
              );
              
              console.log(`[Bot Proxy] Send result:`, sendResult);
            
              if (sendResult) {
                // Save forwarded message in client conversation
                const { error: insertError } = await supabase
                  .from('chat_inbox_messages')
                  .insert({
                    conversation_id: activeSession.client_conversation_id,
                    sender_type: 'agent',
                    content: messageContent,
                    metadata: { 
                      proxied_from_bot: true,
                      original_message_id: savedMessage?.id,
                      bot_phone: normalizedPhone
                    }
                  });
                
                if (insertError) {
                  console.error(`[Bot Proxy] Error saving forwarded message:`, insertError);
                }
                
                // Update session activity
                await supabase
                  .from('bot_proxy_sessions')
                  .update({ last_activity_at: new Date().toISOString() })
                  .eq('id', activeSession.id);
                
                // Update client conversation last_message
                await supabase
                  .from('conversations')
                  .update({
                    last_message_at: new Date().toISOString(),
                    last_message_preview: messageContent.substring(0, 100)
                  })
                  .eq('id', activeSession.client_conversation_id);
                
                console.log(`[Bot Proxy] Successfully forwarded bot message to client`);
                botProxyHandled = true;
              } else {
                console.error(`[Bot Proxy] Failed to send message to client via UAZAPI`);
              }
            }
          } else {
            console.error(`[Bot Proxy] Missing client conversation or instance data`);
          }
        } else {
          console.log(`[Bot Proxy] No active session found for this bot config`);
        }
      }
      
      // If not from bot, check if client conversation has proxy label
      if (!botProxyHandled && !fromMe) {
        // Check if this conversation has the trigger label
        const { data: convLabels } = await supabase
          .from('conversation_labels')
          .select('label_id')
          .eq('conversation_id', conversation.id);
        
        if (convLabels && convLabels.length > 0) {
          const labelIds = convLabels.map(cl => cl.label_id);
          
          // Check if any of these labels is a bot proxy trigger
          const { data: proxyConfig } = await supabase
            .from('bot_proxy_config')
            .select('*')
            .eq('user_id', instance.user_id)
            .eq('is_active', true)
            .in('trigger_label_id', labelIds)
            .maybeSingle();
          
          if (proxyConfig && proxyConfig.instance_id) {
            console.log(`[Bot Proxy] Conversation has proxy label, forwarding to bot ${proxyConfig.bot_phone}`);
            
            // Get or create session
            let { data: session } = await supabase
              .from('bot_proxy_sessions')
              .select('*')
              .eq('config_id', proxyConfig.id)
              .eq('client_conversation_id', conversation.id)
              .eq('is_active', true)
              .maybeSingle();
            
            if (!session) {
              // Create new session
              const { data: newSession } = await supabase
                .from('bot_proxy_sessions')
                .insert({
                  config_id: proxyConfig.id,
                  client_conversation_id: conversation.id,
                  client_phone: normalizedPhone
                })
                .select()
                .single();
              session = newSession;
              console.log(`[Bot Proxy] Created new session: ${session?.id}`);
            }
            
            if (session) {
              const messageContent = message || caption || '';
              const trimmedMessage = messageContent.trim();
              
              // ===== CHECK FOR PLAN CHOICE (1, 2, or 3) =====
              if (proxyConfig.use_mercado_pago && ['1', '2', '3'].includes(trimmedMessage)) {
                console.log(`[Bot Proxy] 🎯 Client chose plan option: ${trimmedMessage}`);
                
                // Fetch the corresponding plan
                const { data: chosenPlan } = await supabase
                  .from('bot_proxy_plans')
                  .select('*')
                  .eq('config_id', proxyConfig.id)
                  .eq('option_number', parseInt(trimmedMessage))
                  .eq('is_active', true)
                  .maybeSingle();
                
                if (chosenPlan) {
                  console.log(`[Bot Proxy] 💰 Generating PIX for plan: ${chosenPlan.name} - R$ ${chosenPlan.price}`);
                  
                  const mercadoPagoToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
                  
                  if (mercadoPagoToken) {
                    try {
                      const expirationDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
                      
                      const mpPayload = {
                        transaction_amount: Number(chosenPlan.price),
                        description: `${chosenPlan.name} - ${chosenPlan.duration_days} dias`,
                        payment_method_id: "pix",
                        payer: {
                          email: "cliente@pagamento.com",
                        },
                        date_of_expiration: expirationDate.toISOString(),
                      };
                      
                      console.log(`[Bot Proxy] Creating MP payment for client choice:`, JSON.stringify(mpPayload));
                      
                      const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${mercadoPagoToken}`,
                          "X-Idempotency-Key": `botproxy-choice-${session.id}-${Date.now()}`,
                        },
                        body: JSON.stringify(mpPayload),
                      });
                      
                      const mpData = await mpResponse.json();
                      
                      if (mpResponse.ok && mpData.point_of_interaction?.transaction_data) {
                        const pixData = mpData.point_of_interaction.transaction_data;
                        const pixCode = pixData.qr_code || '';
                        const pixQrCodeBase64 = pixData.qr_code_base64 || '';
                        
                        console.log(`[Bot Proxy] ✅ PIX generated for client choice!`);
                        
                        // Send QR Code image first
                        if (pixQrCodeBase64) {
                          const qrImageUrl = `data:image/png;base64,${pixQrCodeBase64}`;
                          
                          await fetch(`${uazapiUrl}/send/media`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'token': instance.instance_key
                            },
                            body: JSON.stringify({
                              number: normalizedPhone,
                              media: qrImageUrl,
                              type: 'image',
                              caption: `💳 *Pagamento PIX - ${chosenPlan.name}*\n\n💰 Valor: R$ ${Number(chosenPlan.price).toFixed(2).replace('.', ',')}\n📅 Duração: ${chosenPlan.duration_days} dias\n⏰ Válido por 30 minutos`
                            })
                          });
                          
                          console.log(`[Bot Proxy] QR Code image sent to client`);
                        }
                        
                        // Wait a bit then send the copy-paste code
                        await sleep(1500);
                        
                        const pixMessage = `📋 *Código PIX Copia e Cola:*\n\n\`\`\`${pixCode}\`\`\`\n\n👆 Copie o código acima e cole no seu banco para pagar.\n\n✅ Após o pagamento, envie o comprovante aqui!`;
                        
                        await sendTextViaUazapi(
                          uazapiUrl,
                          instance.instance_key,
                          normalizedPhone,
                          pixMessage
                        );
                        
                        console.log(`[Bot Proxy] PIX code sent to client`);
                        
                        // Save the PIX info in message metadata
                        await supabase
                          .from('chat_inbox_messages')
                          .insert({
                            conversation_id: conversation.id,
                            sender_type: 'agent',
                            content: `💳 PIX gerado - ${chosenPlan.name}: R$ ${Number(chosenPlan.price).toFixed(2).replace('.', ',')} (${chosenPlan.duration_days} dias)`,
                            metadata: { 
                              mercado_pago_payment: true,
                              plan_name: chosenPlan.name,
                              amount: chosenPlan.price,
                              duration_days: chosenPlan.duration_days,
                              pix_code: pixCode.substring(0, 50) + '...',
                              mp_payment_id: mpData.id,
                              client_choice: trimmedMessage
                            }
                          });
                        
                        // Update session and conversation
                        await supabase
                          .from('bot_proxy_sessions')
                          .update({ last_activity_at: new Date().toISOString() })
                          .eq('id', session.id);
                        
                        await supabase
                          .from('conversations')
                          .update({
                            last_message_at: new Date().toISOString(),
                            last_message_preview: '💳 PIX enviado'
                          })
                          .eq('id', conversation.id);
                        
                        console.log(`[Bot Proxy] Successfully sent PIX for client plan choice`);
                        botProxyHandled = true;
                      } else {
                        console.error(`[Bot Proxy] MP Error for client choice:`, JSON.stringify(mpData));
                      }
                    } catch (mpError) {
                      console.error(`[Bot Proxy] Error generating MP PIX for client choice:`, mpError);
                    }
                  } else {
                    console.error(`[Bot Proxy] MERCADO_PAGO_ACCESS_TOKEN not configured`);
                  }
                } else {
                  console.log(`[Bot Proxy] No plan configured for option ${trimmedMessage}, forwarding to bot`);
                }
              }
              
              // If not handled as plan choice, forward to bot
              if (!botProxyHandled) {
                // Get the instance to use for sending to bot
                const { data: proxyInstance } = await supabase
                  .from('whatsapp_instances')
                  .select('*')
                  .eq('id', proxyConfig.instance_id)
                  .single();
                
                if (proxyInstance && proxyInstance.instance_key) {
                  const botPhone = formatPhoneNumber(proxyConfig.bot_phone);
                  
                  console.log(`[Bot Proxy] Forwarding client message to bot ${botPhone}: "${messageContent.substring(0, 50)}..."`);
                  
                  // Send to bot via UAZAPI
                  const sendResult = await sendTextViaUazapi(
                    uazapiUrl,
                    proxyInstance.instance_key,
                    botPhone,
                    messageContent
                  );
                  
                  if (sendResult) {
                    // Update session activity
                    await supabase
                      .from('bot_proxy_sessions')
                      .update({ last_activity_at: new Date().toISOString() })
                      .eq('id', session.id);
                    
                    // Mark message as proxied in metadata
                    if (savedMessage) {
                      await supabase
                        .from('chat_inbox_messages')
                        .update({
                          metadata: {
                            ...((savedMessage.metadata as Record<string, unknown>) || {}),
                            proxied_to_bot: true,
                            bot_phone: proxyConfig.bot_phone
                          }
                        })
                        .eq('id', savedMessage.id);
                    }
                    
                    console.log(`[Bot Proxy] Successfully forwarded client message to bot`);
                    botProxyHandled = true;
                  }
                }
              }
            }
          }
        }
      }
    } catch (proxyError) {
      console.error('[Bot Proxy] Error processing proxy:', proxyError);
    }
    
    // Skip AI processing if bot proxy handled the message
    if (botProxyHandled) {
      console.log('[Bot Proxy] Message handled by bot proxy, skipping AI');
      return new Response(
        JSON.stringify({
          success: true,
          conversationId: conversation.id,
          messageId: savedMessage?.id,
          proxied: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // ===== AUTO-RESUME AI AFTER 1 HOUR =====
    // Check if AI was paused and should be auto-resumed (1 hour timeout)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    let shouldAutoResumeAI = false;
    
    if (!conversation.ai_enabled && conversation.ai_paused_at) {
      const pausedAt = new Date(conversation.ai_paused_at).toISOString();
      if (pausedAt < oneHourAgo) {
        console.log(`[Inbox Webhook] AI was paused at ${pausedAt}, auto-resuming after 1 hour timeout`);
        shouldAutoResumeAI = true;
        
        // Re-enable AI and clear pause timestamp
        await supabase
          .from('conversations')
          .update({
            ai_enabled: true,
            ai_paused_at: null,
            assigned_to: null // Also clear assignment to allow AI to respond
          })
          .eq('id', conversation.id);
        
        // Update local reference
        conversation.ai_enabled = true;
        conversation.ai_paused_at = null;
        conversation.assigned_to = null;
      }
    }

    // Check if AI should respond - only for INCOMING messages (not fromMe)
    if (!fromMe && conversation.ai_enabled && !conversation.assigned_to) {
      console.log('[Inbox Webhook] AI is enabled for incoming message, checking for routing...');
      if (shouldAutoResumeAI) {
        console.log('[Inbox Webhook] AI was auto-resumed after 1 hour timeout');
      }
      
      // Check for AI agent routing
      const { data: routing, error: routingError } = await supabase
        .from('whatsapp_agent_routing')
        .select(`
          *,
          agent:ai_agents(*)
        `)
        .eq('instance_id', instance.id)
        .eq('is_active', true)
        .single();

      if (!routingError && routing && routing.agent) {
        const agent = routing.agent;
        
        if (agent.is_whatsapp_enabled && agent.is_active) {
          console.log(`[Inbox Webhook] Routing to AI agent: ${agent.name} (buffer: ${agent.message_buffer_enabled})`);
          
          // Check if message buffer is enabled
          if (agent.message_buffer_enabled) {
            // ============ MESSAGE BUFFER SYSTEM ============
            const bufferWaitSeconds = agent.buffer_wait_seconds || 5;
            const scheduledAt = new Date(Date.now() + bufferWaitSeconds * 1000).toISOString();
            
            // Check for existing active buffer
            const { data: existingBuffer } = await supabase
              .from('ai_message_buffer')
              .select('*')
              .eq('conversation_id', conversation.id)
              .eq('status', 'buffering')
              .single();
            
            if (existingBuffer) {
              // Add message to existing buffer and reschedule
              const currentMessages = existingBuffer.messages as Array<{ content: string; timestamp: string }>;
              const updatedMessages = [...currentMessages, {
                content: message || caption || '',
                timestamp: new Date().toISOString()
              }];
              
              // Check if we hit max messages
              const maxMessages = agent.buffer_max_messages || 10;
              const shouldForceProcess = updatedMessages.length >= maxMessages;
              
              await supabase
                .from('ai_message_buffer')
                .update({
                  messages: updatedMessages,
                  last_message_at: new Date().toISOString(),
                  scheduled_response_at: shouldForceProcess ? new Date().toISOString() : scheduledAt
                })
                .eq('id', existingBuffer.id);
              
              console.log(`[Inbox Webhook] Added to buffer (${updatedMessages.length}/${maxMessages} msgs), ${shouldForceProcess ? 'forcing process' : `will respond in ${bufferWaitSeconds}s`}`);
            } else {
              // Create new buffer
              await supabase
                .from('ai_message_buffer')
                .insert({
                  conversation_id: conversation.id,
                  phone: normalizedPhone,
                  instance_id: instance.id,
                  user_id: instance.user_id,
                  agent_id: agent.id,
                  messages: [{ content: message || caption || '', timestamp: new Date().toISOString() }],
                  scheduled_response_at: scheduledAt
                });
              
              console.log(`[Inbox Webhook] Created new buffer, AI will respond in ${bufferWaitSeconds}s`);
            }
            
            // Don't call AI here - the buffer processor will handle it
            // Trigger the processor after a delay using fire-and-forget fetch
            // We don't await this - it runs in the background
            const supabaseUrlForBuffer = Deno.env.get('SUPABASE_URL') || '';
            const supabaseServiceKeyForBuffer = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
            
            // Fire and forget - trigger processor after buffer wait time
            // The processor will check scheduled_response_at and only process ready buffers
            setTimeout(async () => {
              try {
                await fetch(`${supabaseUrlForBuffer}/functions/v1/ai-buffer-processor`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKeyForBuffer}`
                  }
                });
                console.log('[Inbox Webhook] Buffer processor triggered');
              } catch (e) {
                console.error('[Inbox Webhook] Error triggering buffer processor:', e);
              }
            }, (bufferWaitSeconds + 1) * 1000);
            
          } else {
            // ============ IMMEDIATE RESPONSE (OLD BEHAVIOR) ============
            const sessionId = conversation.id;
            let assistantResponse = '';
            
            try {
              if (agent.use_native_ai) {
                console.log(`[Inbox Webhook] Calling native AI agent with model: ${agent.ai_model || 'google/gemini-2.5-flash'}`);
                
                const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
                const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
                
                const aiChatResponse = await fetch(
                  `${supabaseUrl}/functions/v1/ai-agent-chat`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${supabaseServiceKey}`
                    },
                    body: JSON.stringify({
                      agentId: agent.id,
                      message: message,
                      sessionId: sessionId,
                      source: 'whatsapp-inbox',
                      phone: normalizedPhone
                    })
                  }
                );

                if (aiChatResponse.ok) {
                  const aiData = await aiChatResponse.json();
                  assistantResponse = aiData.message?.content || aiData.response || '';
                  console.log(`[Inbox Webhook] Native AI response received: ${assistantResponse.substring(0, 100)}...`);
                } else {
                  const errorText = await aiChatResponse.text();
                  console.error('[Inbox Webhook] Native AI error:', errorText);
                }
              } else if (agent.webhook_url) {
                console.log(`[Inbox Webhook] Calling n8n webhook: ${agent.webhook_url}`);
                
                const n8nResponse = await fetch(agent.webhook_url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    message,
                    sessionId,
                    phone: normalizedPhone,
                    source: 'whatsapp-inbox',
                    agentName: agent.name,
                    instanceName: instance.instance_name,
                    conversationId: conversation.id,
                    contactName: conversation.contact_name,
                    metadata: {
                      instance_id: instance.id,
                      instance_key: instance.instance_key
                    }
                  }),
                });

                if (n8nResponse.ok) {
                  const n8nData = await n8nResponse.json();
                  assistantResponse = 
                    n8nData.response || 
                    n8nData.message || 
                    n8nData.output || 
                    n8nData.text ||
                    n8nData.reply ||
                    (typeof n8nData === 'string' ? n8nData : '');
                }
              } else {
                console.log('[Inbox Webhook] Agent has no webhook URL and native AI is disabled');
              }

              if (assistantResponse) {
                // Save AI response
                await supabase
                  .from('chat_inbox_messages')
                  .insert({
                    conversation_id: conversation.id,
                    sender_type: 'ai',
                    content: assistantResponse,
                    metadata: { agent_id: agent.id, agent_name: agent.name }
                  });

                // Format phone number with international support
                const formattedPhone = formatPhoneNumber(normalizedPhone);

                // Build send configuration from agent settings
                const sendConfig: MessageSendConfig = {
                  response_delay_min: agent.response_delay_min ?? DEFAULT_SEND_CONFIG.response_delay_min,
                  response_delay_max: agent.response_delay_max ?? DEFAULT_SEND_CONFIG.response_delay_max,
                  max_lines_per_message: agent.max_lines_per_message ?? DEFAULT_SEND_CONFIG.max_lines_per_message,
                  split_mode: agent.split_mode ?? DEFAULT_SEND_CONFIG.split_mode,
                  split_delay_min: agent.split_delay_min ?? DEFAULT_SEND_CONFIG.split_delay_min,
                  split_delay_max: agent.split_delay_max ?? DEFAULT_SEND_CONFIG.split_delay_max,
                  max_chars_per_message: agent.max_chars_per_message ?? DEFAULT_SEND_CONFIG.max_chars_per_message,
                  typing_simulation: agent.typing_simulation ?? DEFAULT_SEND_CONFIG.typing_simulation
                };

                // Send via UAZAPI with configured delays and splitting
                await sendAIResponseWithConfig(
                  uazapiUrl,
                  instance.instance_key || uazapiToken,
                  formattedPhone,
                  assistantResponse,
                  sendConfig
                );

                console.log('[Inbox Webhook] AI response sent successfully with config');
              }
            } catch (aiError) {
              console.error('[Inbox Webhook] Error calling AI agent:', aiError);
            }
          }
        }
      } else {
        console.log('[Inbox Webhook] No AI routing configured');
      }
    } else {
      console.log('[Inbox Webhook] AI disabled or conversation assigned, waiting for human response');
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: conversation.id,
        messageId: savedMessage?.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('[Inbox Webhook] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
