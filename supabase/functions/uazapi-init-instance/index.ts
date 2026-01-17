// Uazapi Init Instance - Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UAZAPI_BASE_URL = 'https://zynk2.uazapi.com';

serve(async (req) => {
  console.log('=== uazapi-init-instance START ===');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const UAZAPI_ADMIN_TOKEN = Deno.env.get('UAZAPI_ADMIN_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('UAZAPI_ADMIN_TOKEN:', UAZAPI_ADMIN_TOKEN ? 'SET' : 'MISSING');
    console.log('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
    
    if (!UAZAPI_ADMIN_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'UAZAPI_ADMIN_TOKEN não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    console.log('Body:', JSON.stringify(body));
    
    const { name, user_id } = body;

    if (!name || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Nome e user_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calling Uazapi: ${UAZAPI_BASE_URL}/instance/init`);

    // Create instance on Uazapi
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

    console.log('Uazapi status:', uazapiResponse.status);
    const uazapiText = await uazapiResponse.text();
    console.log('Uazapi response:', uazapiText);
    
    let uazapiData;
    try {
      uazapiData = JSON.parse(uazapiText);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Resposta inválida da Uazapi', details: uazapiText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!uazapiResponse.ok) {
      return new Response(
        JSON.stringify({ error: uazapiData.message || 'Erro na Uazapi', details: uazapiData }),
        { status: uazapiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save to database using REST API directly
    const instanceData = {
      user_id: user_id,
      instance_id: uazapiData.id || uazapiData.name || name,
      instance_name: name,
      token: uazapiData.token,
      status: 'disconnected',
    };

    console.log('Saving to DB:', JSON.stringify(instanceData));

    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_instances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(instanceData),
    });

    console.log('DB response status:', dbResponse.status);
    const dbText = await dbResponse.text();
    console.log('DB response:', dbText);

    if (!dbResponse.ok) {
      // Rollback: delete from Uazapi
      await fetch(`${UAZAPI_BASE_URL}/instance/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'token': uazapiData.token },
      });
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar no banco', details: dbText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let savedInstance;
    try {
      const parsed = JSON.parse(dbText);
      savedInstance = Array.isArray(parsed) ? parsed[0] : parsed;
    } catch {
      savedInstance = instanceData;
    }

    console.log('=== SUCCESS ===');

    return new Response(
      JSON.stringify({ 
        success: true, 
        instance: { ...savedInstance, token: uazapiData.token },
        message: 'Instância criada com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
