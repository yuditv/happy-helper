import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    // Media fields
    hasMedia?: boolean;
    mediaType?: string;
    mediaUrl?: string;
    caption?: string;
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

function extractMessageData(body: UAZAPIWebhookPayload): { phone: string; message: string; contactName: string; mediaUrl?: string; mediaType?: string } | null {
  // Try UAZAPI v2 format first (EventType + message object)
  if ((body.EventType === 'messages' || body.event === 'messages') && body.message && typeof body.message === 'object') {
    const msgObj = body.message;
    
    // Skip if message is from us
    if (msgObj.fromMe) {
      console.log("[Inbox Webhook] Skipping outgoing message (fromMe=true)");
      return null;
    }
    
    // Skip group messages for now (Central de Atendimento focuses on 1:1 conversations)
    if (msgObj.isGroup) {
      console.log("[Inbox Webhook] Skipping group message");
      return null;
    }
    
    // Extract phone from sender_pn (format: 559187459963@s.whatsapp.net)
    const phone = msgObj.sender_pn?.replace('@s.whatsapp.net', '').replace('@g.us', '') || '';
    
    // Extract message text
    const message = msgObj.text || msgObj.content?.text || '';
    
    // Extract contact name
    const contactName = msgObj.senderName || phone;
    
    // Extract media if present
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    if (msgObj.hasMedia && msgObj.mediaUrl) {
      mediaUrl = msgObj.mediaUrl;
      mediaType = msgObj.mediaType;
    }
    
    console.log(`[Inbox Webhook] UAZAPI v2 format detected - phone: ${phone}, message: ${message.substring(0, 50)}...`);
    return { phone, message, contactName, mediaUrl, mediaType };
  }
  
  // Try legacy UAZAPI webhook format with data wrapper
  if (body.data?.key?.remoteJid) {
    const remoteJid = body.data.key.remoteJid;
    // Skip if message is from us
    if (body.data.key.fromMe) {
      console.log("[Inbox Webhook] Skipping outgoing message (fromMe=true)");
      return null;
    }
    
    // Extract phone from remoteJid (format: 5591999999999@s.whatsapp.net)
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    
    // Extract message content from various message types
    const msgData = body.data.message;
    let message = '';
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    
    if (msgData?.conversation) {
      message = msgData.conversation;
    } else if (msgData?.extendedTextMessage?.text) {
      message = msgData.extendedTextMessage.text;
    } else if (msgData?.imageMessage) {
      message = msgData.imageMessage.caption || '[Imagem]';
      mediaUrl = msgData.imageMessage.url;
      mediaType = 'image';
    } else if (msgData?.videoMessage) {
      message = msgData.videoMessage.caption || '[Vídeo]';
      mediaUrl = msgData.videoMessage.url;
      mediaType = 'video';
    } else if (msgData?.audioMessage) {
      message = '[Áudio]';
      mediaUrl = msgData.audioMessage.url;
      mediaType = 'audio';
    } else if (msgData?.documentMessage) {
      message = msgData.documentMessage.fileName || '[Documento]';
      mediaUrl = msgData.documentMessage.url;
      mediaType = 'document';
    }
    
    const contactName = body.data.pushName || phone;
    
    console.log(`[Inbox Webhook] Legacy UAZAPI format detected - phone: ${phone}`);
    return { phone, message, contactName, mediaUrl, mediaType };
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
async function handleMessageStatusUpdate(supabase: any, body: UAZAPIWebhookPayload) {
  try {
    // Extract message ID and status from various UAZAPI formats
    let messageId: string | undefined;
    let ackStatus: number | undefined;
    let phone: string | undefined;
    
    // UAZAPI v2 format
    if (body.message?.id) {
      messageId = body.message.id;
    } else if (body.id) {
      messageId = body.id;
    } else if (body.data?.key?.id) {
      messageId = body.data.key.id;
    }
    
    // Get ack status (0=pending, 1=sent, 2=delivered, 3=read)
    if (typeof body.ack === 'number') {
      ackStatus = body.ack;
    }
    
    // Get phone for matching
    if (body.message?.sender_pn) {
      phone = body.message.sender_pn.replace('@s.whatsapp.net', '');
    } else if (body.data?.key?.remoteJid) {
      phone = body.data.key.remoteJid.replace('@s.whatsapp.net', '');
    } else if (body.phone) {
      phone = body.phone.replace(/\D/g, '');
    }
    
    console.log(`[Inbox Webhook] Status update - messageId: ${messageId}, ack: ${ackStatus}, phone: ${phone}`);
    
    if (!phone && !messageId) {
      console.log('[Inbox Webhook] No identifier found for status update');
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
      console.log('[Inbox Webhook] Unknown ack status:', ackStatus);
      return;
    }
    
    // Find and update the message
    // First try by message ID in metadata
    if (messageId) {
      const { data: messages, error } = await supabase
        .from('chat_inbox_messages')
        .select('id, metadata')
        .eq('sender_type', 'agent')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!error && messages) {
        // Find message by ID in metadata
        // deno-lint-ignore no-explicit-any
        const matchingMessage = messages.find((m: any) => 
          m.metadata?.whatsapp_id === messageId
        );
        
        if (matchingMessage) {
          await supabase
            .from('chat_inbox_messages')
            .update({
              metadata: {
                ...matchingMessage.metadata,
                status: newStatus
              },
              is_read: newStatus === 'read'
            })
            .eq('id', matchingMessage.id);
          
          console.log(`[Inbox Webhook] Updated message ${matchingMessage.id} status to ${newStatus}`);
          return;
        }
      }
    }
    
    // Fallback: Update most recent outgoing message to this phone
    if (phone) {
      // Find conversation by phone
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('phone', phone);
      
      if (conversations && conversations.length > 0) {
        // deno-lint-ignore no-explicit-any
        const conversationIds = conversations.map((c: any) => c.id);
        
        // Get most recent outgoing message
        const { data: recentMessages, error: msgError } = await supabase
          .from('chat_inbox_messages')
          .select('id, metadata')
          .in('conversation_id', conversationIds)
          .eq('sender_type', 'agent')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!msgError && recentMessages && recentMessages.length > 0) {
          const msg = recentMessages[0];
          const currentStatus = msg.metadata?.status;
          
          // Only update if new status is "higher" (sent < delivered < read)
          const statusOrder: Record<string, number> = { sending: 0, sent: 1, delivered: 2, read: 3 };
          const currentOrder = statusOrder[currentStatus as string] ?? -1;
          const newOrder = statusOrder[newStatus] ?? -1;
          
          if (newOrder > currentOrder) {
            await supabase
              .from('chat_inbox_messages')
              .update({
                metadata: {
                  ...msg.metadata,
                  status: newStatus
                },
                is_read: newStatus === 'read'
              })
              .eq('id', msg.id);
            
            console.log(`[Inbox Webhook] Updated recent message ${msg.id} status to ${newStatus}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('[Inbox Webhook] Error handling status update:', error);
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
    const statusEvents = ['message_ack', 'ack', 'message.ack', 'messages.ack', 'status'];
    const isStatusEvent = eventType && statusEvents.includes(eventType);
    
    if (isStatusEvent) {
      console.log(`[Inbox Webhook] Processing message status update: ${eventType}`);
      await handleMessageStatusUpdate(supabase, body);
      return new Response(
        JSON.stringify({ success: true, event: eventType, type: 'status_update' }),
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

    if (extractedData) {
      // UAZAPI format
      phone = extractedData.phone;
      message = extractedData.message;
      contactName = extractedData.contactName;
      mediaUrl = extractedData.mediaUrl;
      mediaType = extractedData.mediaType;
      instanceKey = body.token || body.instance;
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

    console.log(`[Inbox Webhook] Received message from: ${phone}, instanceKey: ${instanceKey || 'none'}, instanceId: ${instanceId || 'none'}`);

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'phone and message are required' }),
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

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          instance_id: instance.id,
          user_id: instance.user_id,
          phone: normalizedPhone,
          contact_name: contactName || normalizedPhone,
          contact_avatar: contactAvatar,
          status: 'open',
          ai_enabled: true,
          unread_count: 1,
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 100)
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
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          status: conversation.status === 'resolved' ? 'open' : conversation.status,
          unread_count: (conversation.unread_count || 0) + 1,
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 100),
          contact_name: contactName || conversation.contact_name
        })
        .eq('id', conversation.id);

      if (updateError) {
        console.error('[Inbox Webhook] Error updating conversation:', updateError);
      }
      console.log(`[Inbox Webhook] Updated conversation: ${conversation.id}`);
    }

    // Save incoming message
    const { data: savedMessage, error: msgError } = await supabase
      .from('chat_inbox_messages')
      .insert({
        conversation_id: conversation.id,
        sender_type: 'contact',
        content: message,
        media_url: mediaUrl,
        media_type: mediaType,
        metadata: { phone, original_message: body }
      })
      .select()
      .single();

    if (msgError) {
      console.error('[Inbox Webhook] Error saving message:', msgError);
    } else {
      console.log(`[Inbox Webhook] Saved message: ${savedMessage.id}`);
    }

    // Check if AI should respond
    if (conversation.ai_enabled && !conversation.assigned_to) {
      console.log('[Inbox Webhook] AI is enabled, checking for routing...');
      
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
          console.log(`[Inbox Webhook] Routing to AI agent: ${agent.name}`);
          
          const sessionId = `inbox-${conversation.id}`;
          
          try {
            // Call n8n webhook
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

            let assistantResponse = '';
            
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

              // Format phone number
              let formattedPhone = normalizedPhone;
              if (!formattedPhone.startsWith('55')) {
                formattedPhone = '55' + formattedPhone;
              }

              // Send via UAZAPI - format: /send/text with token header and { number, text }
              await fetch(`${uazapiUrl}/send/text`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'token': instance.instance_key || uazapiToken
                },
                body: JSON.stringify({
                  number: formattedPhone,
                  text: assistantResponse
                })
              });

              console.log('[Inbox Webhook] AI response sent successfully');
            }
          } catch (aiError) {
            console.error('[Inbox Webhook] Error calling AI agent:', aiError);
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
