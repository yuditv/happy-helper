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
    const ADMIN_TOKEN = Deno.env.get('UAZAPI_ADMIN_TOKEN');
    if (!ADMIN_TOKEN) {
      console.error('UAZAPI_ADMIN_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Token de administrador não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, user_id } = await req.json();
    
    if (!name || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome e user_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating instance with name: ${name} for user: ${user_id}`);

    // Create instance in Uazapi
    const response = await fetch(`${UAZAPI_URL}/instance/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admintoken': ADMIN_TOKEN,
      },
      body: JSON.stringify({ name }),
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

    // The API returns the instance token
    const instanceToken = data.token;
    const instanceId = data.id || data._id;

    if (!instanceToken) {
      console.error('No token in response:', data);
      return new Response(
        JSON.stringify({ success: false, error: 'Token não retornado pela API', data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: insertedData, error: dbError } = await supabase
      .from('whatsapp_instances')
      .insert({
        user_id,
        instance_id: instanceId || name,
        instance_name: name,
        token: instanceToken,
        status: 'disconnected',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar instância no banco', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Instance created and saved:', insertedData);

    return new Response(
      JSON.stringify({ success: true, instance: insertedData, uazapi: data }),
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
