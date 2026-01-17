import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const UAZAPI_ADMIN_TOKEN = Deno.env.get('UAZAPI_ADMIN_TOKEN');
    
    if (!UAZAPI_ADMIN_TOKEN) {
      console.error('UAZAPI_ADMIN_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Token de administrador não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name } = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Nome da instância é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating instance with name: ${name}`);

    // Create new instance using Uazapi API
    const response = await fetch('https://yudipro.uazapi.com/instance/init', {
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

    const data = await response.json();
    console.log('Uazapi response:', JSON.stringify(data));

    if (!response.ok) {
      console.error('Error from Uazapi:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'Erro ao criar instância' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        instance: data,
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
