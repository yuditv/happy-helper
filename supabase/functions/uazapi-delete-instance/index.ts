// Uazapi Delete Instance - Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UAZAPI_BASE_URL = 'https://yudipro.uazapi.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const UAZAPI_ADMIN_TOKEN = Deno.env.get('UAZAPI_ADMIN_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!UAZAPI_ADMIN_TOKEN) {
      console.error('UAZAPI_ADMIN_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Token de administrador não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token, instance_id } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token da instância é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting instance with token: ${token.substring(0, 10)}...`);

    // Delete instance using Uazapi API
    const response = await fetch(`${UAZAPI_BASE_URL}/instance/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
    });

    const data = await response.json();
    console.log('Uazapi delete response:', JSON.stringify(data));

    if (!response.ok) {
      console.error('Error from Uazapi:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'Erro ao deletar instância' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete from database
    if (instance_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { error: dbError } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', instance_id);

      if (dbError) {
        console.error('Error deleting from database:', dbError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Instância deletada com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error deleting instance:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
