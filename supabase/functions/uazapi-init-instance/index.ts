// Uazapi Init Instance - Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UAZAPI_BASE_URL = 'https://zynk2.uazapi.com';

serve(async (req) => {
  console.log('=== uazapi-init-instance START ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const UAZAPI_ADMIN_TOKEN = Deno.env.get('UAZAPI_ADMIN_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('ENV CHECK:');
    console.log('- UAZAPI_ADMIN_TOKEN:', UAZAPI_ADMIN_TOKEN ? `exists (${UAZAPI_ADMIN_TOKEN.substring(0, 8)}...)` : 'MISSING');
    console.log('- SUPABASE_URL:', SUPABASE_URL ? 'exists' : 'MISSING');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'exists' : 'MISSING');
    
    if (!UAZAPI_ADMIN_TOKEN) {
      console.error('ERROR: UAZAPI_ADMIN_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Token de administrador não configurado', code: 'MISSING_ADMIN_TOKEN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('ERROR: Supabase credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Credenciais do Supabase não configuradas', code: 'MISSING_SUPABASE_CREDS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body;
    try {
      body = await req.json();
      console.log('Request body:', JSON.stringify(body));
    } catch (e) {
      console.error('ERROR: Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ error: 'Body inválido', code: 'INVALID_BODY' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { name, user_id } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Nome da instância é obrigatório', code: 'MISSING_NAME' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'ID do usuário é obrigatório', code: 'MISSING_USER_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating instance: "${name}" for user: ${user_id}`);
    console.log(`Calling Uazapi: ${UAZAPI_BASE_URL}/instance/init`);

    // Create new instance using Uazapi API
    const uazapiPayload = {
      name: name,
      reject_call: true,
      msg_call: 'Não posso atender ligações no momento.',
      groups_ignore: true,
      always_online: true,
      read_messages: true,
      read_status: false,
    };
    
    console.log('Uazapi payload:', JSON.stringify(uazapiPayload));
    
    const uazapiResponse = await fetch(`${UAZAPI_BASE_URL}/instance/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admin_token': UAZAPI_ADMIN_TOKEN,
      },
      body: JSON.stringify(uazapiPayload),
    });

    console.log('Uazapi response status:', uazapiResponse.status);
    console.log('Uazapi response headers:', JSON.stringify(Object.fromEntries(uazapiResponse.headers.entries())));
    
    const responseText = await uazapiResponse.text();
    console.log('Uazapi response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('ERROR: Failed to parse Uazapi response as JSON');
      return new Response(
        JSON.stringify({ 
          error: 'Resposta inválida da Uazapi', 
          code: 'INVALID_UAZAPI_RESPONSE',
          details: responseText.substring(0, 500)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Uazapi response data:', JSON.stringify(data));

    if (!uazapiResponse.ok) {
      console.error('ERROR from Uazapi:', data);
      return new Response(
        JSON.stringify({ 
          error: data.message || data.error || 'Erro ao criar instância na Uazapi',
          code: 'UAZAPI_ERROR',
          status: uazapiResponse.status,
          details: data
        }),
        { status: uazapiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save instance to database
    console.log('Creating Supabase client...');
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
      console.error('DATABASE ERROR:', dbError);
      // Try to delete the instance from Uazapi
      try {
        console.log('Rolling back: deleting instance from Uazapi...');
        await fetch(`${UAZAPI_BASE_URL}/instance/delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'token': data.token,
          },
        });
        console.log('Rollback successful');
      } catch (e) {
        console.error('Rollback failed:', e);
      }
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao salvar instância no banco', 
          code: 'DATABASE_ERROR',
          details: dbError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Instance saved successfully:', JSON.stringify(savedInstance));
    console.log('=== uazapi-init-instance SUCCESS ===');

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
    console.error('=== UNHANDLED ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    const stack = error instanceof Error ? error.stack : undefined;
    return new Response(
      JSON.stringify({ 
        error: message, 
        code: 'UNHANDLED_ERROR',
        stack: stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
