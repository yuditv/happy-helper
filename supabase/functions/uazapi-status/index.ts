import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UAZAPI_URL = 'https://zynk2.uazapi.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, instance_id } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token da instância é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Getting status for instance with token: ${token.substring(0, 10)}...`);

    const response = await fetch(`${UAZAPI_URL}/instance/status`, {
      method: 'GET',
      headers: {
        'token': token,
      },
    });

    const responseText = await response.text();
    console.log('Uazapi response status:', response.status);
    console.log('Uazapi response:', responseText);

    if (!response.ok) {
      console.error('Uazapi error:', responseText);
      return new Response(
        JSON.stringify({ success: false, error: `Erro da API: ${response.status}`, details: responseText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Resposta inválida da API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Status response:', data);

    // Determine status based on response
    let status: 'connected' | 'disconnected' | 'connecting' | 'qr' = 'disconnected';
    if (data.connected || data.loggedIn) {
      status = 'connected';
    } else if (data.status === 'qr' || data.qrcode) {
      status = 'qr';
    } else if (data.status === 'connecting') {
      status = 'connecting';
    }

    // Update database if instance_id is provided
    if (instance_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      // Update profile info if connected
      if (status === 'connected' && data.instance) {
        if (data.instance.phone) updateData.phone = data.instance.phone;
        if (data.instance.name || data.instance.pushName) updateData.profile_name = data.instance.name || data.instance.pushName;
        if (data.instance.profilePicUrl) updateData.profile_picture = data.instance.profilePicUrl;
      }

      const { error: dbError } = await supabase
        .from('whatsapp_instances')
        .update(updateData)
        .eq('id', instance_id);

      if (dbError) {
        console.error('Database update error:', dbError);
      } else {
        console.log('Database updated with status:', status);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status,
        connected: data.connected || data.loggedIn || false,
        data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
