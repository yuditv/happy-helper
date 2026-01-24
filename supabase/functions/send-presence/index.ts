import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, presence, delay = 30000 } = await req.json();

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: 'conversationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!presence || !['composing', 'recording', 'paused'].includes(presence)) {
      return new Response(
        JSON.stringify({ error: 'presence must be composing, recording, or paused' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const uazapiUrl = Deno.env.get('UAZAPI_URL')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, phone, instance_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('Error fetching conversation:', convError);
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get WhatsApp instance
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name, instance_key')
      .eq('id', conversation.instance_id)
      .single();

    if (instanceError || !instance || !instance.instance_key) {
      console.error('Error fetching instance:', instanceError);
      return new Response(
        JSON.stringify({ error: 'WhatsApp instance not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare UAZAPI request
    const presenceUrl = `${uazapiUrl}/message/presence`;

    // Format phone number
    let formattedPhone = conversation.phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log(`[Presence] Sending ${presence} to ${formattedPhone} via ${instance.instance_name}`);

    // Send presence update to UAZAPI
    const uazapiResponse = await fetch(presenceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instance.instance_key,
      },
      body: JSON.stringify({
        number: formattedPhone,
        presence: presence,
        delay: delay
      }),
    });

    const responseText = await uazapiResponse.text();
    console.log(`[Presence] Response (${uazapiResponse.status}):`, responseText);

    if (!uazapiResponse.ok) {
      console.error('[Presence] UAZAPI error:', responseText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send presence update',
          details: responseText 
        }),
        { status: uazapiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        presence,
        phone: formattedPhone,
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in send-presence:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
