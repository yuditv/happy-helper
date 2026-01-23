import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// UAZAPI webhook format
interface UAZAPIWebhookPayload {
  event?: string;
  instance?: string;
  token?: string;
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
  // Alternative fields that UAZAPI might send
  phone?: string;
  message?: string;
  from?: string;
  text?: string;
  name?: string;
  remoteJid?: string;
  pushName?: string;
}

function extractMessageData(body: UAZAPIWebhookPayload): { phone: string; message: string; contactName: string; mediaUrl?: string; mediaType?: string } | null {
  // Try UAZAPI webhook format first
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
    
    return { phone, message, contactName, mediaUrl, mediaType };
  }
  
  // Try alternative UAZAPI formats
  if (body.remoteJid) {
    const phone = body.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const message = body.message || body.text || '';
    const contactName = body.pushName || body.name || phone;
    return { phone, message, contactName };
  }
  
  // Try direct fields
  if (body.phone && body.message) {
    return {
      phone: body.phone.replace(/\D/g, ''),
      message: body.message,
      contactName: body.name || body.phone
    };
  }
  
  if (body.from) {
    return {
      phone: body.from.replace(/\D/g, '').replace('@s.whatsapp.net', ''),
      message: body.message || body.text || '',
      contactName: body.name || body.from
    };
  }
  
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const uazapiUrl = Deno.env.get('UAZAPI_URL')!;
    const uazapiToken = Deno.env.get('UAZAPI_TOKEN')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("[Inbox Webhook] Received payload:", JSON.stringify(body));

    // Check if this is a non-message event (status, qrcode, etc.)
    if (body.event && body.event !== 'messages' && body.event !== 'message') {
      console.log(`[Inbox Webhook] Ignoring event type: ${body.event}`);
      return new Response(
        JSON.stringify({ success: true, ignored: true, event: body.event }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          instance_id: instance.id,
          user_id: instance.user_id,
          phone: normalizedPhone,
          contact_name: contactName || normalizedPhone,
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

              // Send via UAZAPI
              await fetch(`${uazapiUrl}/chat/send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'token': instance.instance_key || uazapiToken
                },
                body: JSON.stringify({
                  phone: normalizedPhone,
                  message: assistantResponse
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
