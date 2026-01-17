// Uazapi Init Instance - Edge Function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UAZAPI_BASE_URL = 'https://yudipro.uazapi.com';

Deno.serve(async (req) => {
  console.log('uazapi-init-instance called, method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const UAZAPI_ADMIN_TOKEN = Deno.env.get('UAZAPI_ADMIN_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Env check - UAZAPI_ADMIN_TOKEN:', !!UAZAPI_ADMIN_TOKEN);
    console.log('Env check - SUPABASE_URL:', !!SUPABASE_URL);
    console.log('Env check - SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
    
    if (!UAZAPI_ADMIN_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Token de administrador não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Credenciais do Supabase não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { name, user_id } = body;
    
    console.log('Request body:', JSON.stringify(body));

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

    console.log(`Creating instance with name: ${name} for user: ${user_id}`);

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

    const data = await uazapiResponse.json();
    console.log('Uazapi response status:', uazapiResponse.status);
    console.log('Uazapi response:', JSON.stringify(data));

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

    console.log('Saving instance to database:', JSON.stringify(instanceData));

    const { data: savedInstance, error: dbError } = await supabase
      .from('whatsapp_instances')
      .insert(instanceData)
      .select()
      .single();

    if (dbError) {
      console.error('Error saving to database:', dbError);
      // Try to delete the instance from Uazapi since we couldn't save it
      try {
        await fetch(`${UAZAPI_BASE_URL}/instance/delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'token': data.token,
          },
        });
      } catch (e) {
        console.error('Failed to rollback instance:', e);
      }
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar instância no banco de dados', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Instance saved successfully:', JSON.stringify(savedInstance));

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
    console.error('Error creating instance:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
