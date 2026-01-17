// Uazapi Init Instance - Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UAZAPI_BASE_URL = 'https://yudipro.uazapi.com';

serve(async (req) => {
  console.log('=== uazapi-init-instance called ===');
  console.log('Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const UAZAPI_ADMIN_TOKEN = Deno.env.get('UAZAPI_ADMIN_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('UAZAPI_ADMIN_TOKEN exists:', !!UAZAPI_ADMIN_TOKEN);
    console.log('SUPABASE_URL exists:', !!SUPABASE_URL);
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!SUPABASE_SERVICE_ROLE_KEY);
    
    if (!UAZAPI_ADMIN_TOKEN) {
      console.error('UAZAPI_ADMIN_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Token de administrador não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Credenciais do Supabase não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const { name, user_id } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Nome da instância é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'ID do usuário é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating instance: ${name} for user: ${user_id}`);

    // Create new instance using Uazapi API
    const uazapiResponse = await fetch(`${UAZAPI_BASE_URL}/instance/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admin_token': UAZAPI_ADMIN_TOKEN,
      },
      body: JSON.stringify({
        name: name,
        reject_call: true,
        msg_call: 'Não posso atender ligações no momento.',
        groups_ignore: true,
        always_online: true,
        read_messages: true,
        read_status: false,
      }),
    });

    console.log('Uazapi response status:', uazapiResponse.status);
    const data = await uazapiResponse.json();
    console.log('Uazapi response data:', JSON.stringify(data));

    if (!uazapiResponse.ok) {
      console.error('Error from Uazapi:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'Erro ao criar instância na Uazapi' }),
        { status: uazapiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save instance to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const instanceData = {
      user_id: user_id,
      instance_id: data.id || data.name || name,
      instance_name: name,
      token: data.token,
      status: 'disconnected',
    };

    console.log('Saving to database:', JSON.stringify(instanceData));

    const { data: savedInstance, error: dbError } = await supabase
      .from('whatsapp_instances')
      .insert(instanceData)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to delete the instance from Uazapi
      try {
        await fetch(`${UAZAPI_BASE_URL}/instance/delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'token': data.token,
          },
        });
        console.log('Rolled back Uazapi instance');
      } catch (e) {
        console.error('Failed to rollback:', e);
      }
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar instância', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Instance saved:', JSON.stringify(savedInstance));

    return new Response(
      JSON.stringify({ 
        success: true, 
        instance: {
          ...savedInstance,
          token: data.token,
        },
        message: 'Instância criada com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
