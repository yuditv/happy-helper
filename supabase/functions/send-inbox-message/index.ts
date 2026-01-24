import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  conversationId: string;
  content: string;
  isPrivate?: boolean;
  mediaUrl?: string;
  mediaType?: string;
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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SendMessageRequest = await req.json();
    const { conversationId, content, isPrivate = false, mediaUrl, mediaType } = body;

    if (!conversationId || !content) {
      return new Response(
        JSON.stringify({ error: 'conversationId and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Send Inbox] User ${user.id} sending message to conversation ${conversationId}`);

    // Get conversation first
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('[Send Inbox] Conversation not found:', convError);
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get instance separately (no JOIN needed)
    let instance = null;
    if (conversation.instance_id) {
      const { data: instanceData, error: instanceError } = await supabaseAdmin
        .from('whatsapp_instances')
        .select('*')
        .eq('id', conversation.instance_id)
        .single();
      
      if (instanceError) {
        console.error('[Send Inbox] Error fetching instance:', instanceError);
      } else {
        instance = instanceData;
      }
    }

    // Save message to database
    const { data: savedMessage, error: msgError } = await supabaseAdmin
      .from('chat_inbox_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: user.id,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        is_private: isPrivate,
        metadata: { sent_by: user.email }
      })
      .select()
      .single();

    if (msgError) {
      console.error('[Send Inbox] Error saving message:', msgError);
      return new Response(
        JSON.stringify({ error: 'Failed to save message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update conversation
    const updateData: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
      last_message_preview: content.substring(0, 100),
      ai_enabled: false, // Disable AI when human responds
    };

    // Set first_reply_at if this is the first agent reply
    if (!conversation.first_reply_at) {
      updateData.first_reply_at = new Date().toISOString();
    }

    // Auto-assign to current user if not assigned
    if (!conversation.assigned_to) {
      updateData.assigned_to = user.id;
    }

    await supabaseAdmin
      .from('conversations')
      .update(updateData)
      .eq('id', conversationId);

    // If not private, send via WhatsApp
    if (!isPrivate && instance) {
      const phone = conversation.phone;
      const instanceToken = instance.instance_key;

      console.log(`[Send Inbox] Sending to WhatsApp: ${phone} via instance ${instance.instance_name}`);

      try {
        // Use same format as warming-worker/campaigns (which work!)
        // /sendText endpoint with Authorization: Bearer header
        console.log(`[Send Inbox] Sending via /sendText with Bearer auth`);
        console.log(`[Send Inbox] URL: ${uazapiUrl}/sendText`);
        console.log(`[Send Inbox] Phone: ${phone}`);
        
        let sendSuccess = false;
        let lastError = '';

        // Determine if sending media or text
        if (mediaUrl && mediaType) {
          // Media message
          let endpoint = '/sendImage';
          const body: Record<string, unknown> = { phone };
          
          if (mediaType.startsWith('image/')) {
            endpoint = '/sendImage';
            body.image = mediaUrl;
            body.caption = content || '';
          } else if (mediaType.startsWith('video/')) {
            endpoint = '/sendVideo';
            body.video = mediaUrl;
            body.caption = content || '';
          } else if (mediaType.startsWith('audio/')) {
            endpoint = '/sendAudio';
            body.audio = mediaUrl;
          } else {
            endpoint = '/sendDocument';
            body.document = mediaUrl;
            body.filename = 'file';
          }
          
          console.log(`[Send Inbox] Sending media via ${endpoint}`);
          
          const sendResponse = await fetch(`${uazapiUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${instanceToken}`
            },
            body: JSON.stringify(body)
          });
          
          const responseText = await sendResponse.text();
          console.log(`[Send Inbox] Status: ${sendResponse.status}`);
          console.log(`[Send Inbox] Response: ${responseText}`);
          
          if (sendResponse.ok) {
            console.log('[Send Inbox] ✅ Media sent successfully!');
            sendSuccess = true;
          } else {
            lastError = `${sendResponse.status}: ${responseText}`;
          }
        } else {
          // Text message - use /sendText
          const sendResponse = await fetch(`${uazapiUrl}/sendText`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${instanceToken}`
            },
            body: JSON.stringify({
              phone,
              message: content
            })
          });
          
          const responseText = await sendResponse.text();
          console.log(`[Send Inbox] Status: ${sendResponse.status}`);
          console.log(`[Send Inbox] Response: ${responseText}`);
          
          if (sendResponse.ok) {
            console.log('[Send Inbox] ✅ Message sent successfully!');
            sendSuccess = true;
          } else {
            lastError = `${sendResponse.status}: ${responseText}`;
          }
        }

        if (!sendSuccess) {
          console.error('[Send Inbox] Failed to send. Error:', lastError);
          
          // Update message with error status
          await supabaseAdmin
            .from('chat_inbox_messages')
            .update({ metadata: { ...savedMessage.metadata, send_error: lastError } })
            .eq('id', savedMessage.id);
        }
      } catch (sendError) {
        console.error('[Send Inbox] Error sending to WhatsApp:', sendError);
      }
    } else if (!isPrivate && !instance) {
      console.warn('[Send Inbox] No instance found for conversation, message saved but not sent to WhatsApp');
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: savedMessage.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('[Send Inbox] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
