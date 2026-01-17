// Uazapi Status - Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UAZAPI_BASE_URL = 'https://zynk2.uazapi.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const { token, instance_id } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token da instância é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Getting status for token: ${token.substring(0, 10)}...`);

    const response = await fetch(`${UAZAPI_BASE_URL}/instance/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
    });

    const data = await response.json();
    console.log('Uazapi status response:', JSON.stringify(data));

    if (!response.ok) {
      console.error('Error from Uazapi:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'Erro ao obter status' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine status
    const isConnected = data.connected || data.status === 'open' || data.state === 'open';
    const status = isConnected ? 'connected' : 
                   (data.status === 'qrcode' || data.state === 'qrcode') ? 'qr' :
                   (data.status === 'connecting' || data.state === 'connecting') ? 'connecting' : 
                   'disconnected';

    // Update status in database if instance_id is provided
    if (instance_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const updateData: Record<string, unknown> = {
        status: status,
        updated_at: new Date().toISOString(),
      };

      if (isConnected) {
        if (data.phone || data.wid) {
          updateData.phone = (data.phone || data.wid || '').replace('@s.whatsapp.net', '');
        }
        if (data.pushname || data.profile?.name) {
          updateData.profile_name = data.pushname || data.profile?.name;
        }
        if (data.picture || data.profile?.picture) {
          updateData.profile_picture = data.picture || data.profile?.picture;
        }
      }

      const { error: dbError } = await supabase
        .from('whatsapp_instances')
        .update(updateData)
        .eq('id', instance_id);

      if (dbError) {
        console.error('Error updating database:', dbError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: status,
        connected: isConnected,
        phone: (data.phone || data.wid || '').replace('@s.whatsapp.net', ''),
        profile: {
          name: data.pushname || data.profile?.name,
          picture: data.picture || data.profile?.picture,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error getting status:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
