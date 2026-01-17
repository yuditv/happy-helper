// Uazapi Disconnect - Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UAZAPI_BASE_URL = 'https://yudipro.uazapi.com';

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

    console.log(`Disconnecting instance with token: ${token.substring(0, 10)}...`);

    const response = await fetch(`${UAZAPI_BASE_URL}/instance/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
    });

    const data = await response.json();
    console.log('Uazapi disconnect response:', JSON.stringify(data));

    if (!response.ok) {
      console.error('Error from Uazapi:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'Erro ao desconectar instância' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status in database
    if (instance_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { error: dbError } = await supabase
        .from('whatsapp_instances')
        .update({
          status: 'disconnected',
          phone: null,
          profile_name: null,
          profile_picture: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance_id);

      if (dbError) {
        console.error('Error updating database:', dbError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Instância desconectada com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error disconnecting instance:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
