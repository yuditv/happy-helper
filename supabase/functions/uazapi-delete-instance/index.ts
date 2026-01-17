import { createClient } from "npm:@supabase/supabase-js@2";

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

    console.log(`Deleting instance with token: ${token.substring(0, 10)}...`);

    const response = await fetch(`${UAZAPI_URL}/instance`, {
      method: 'DELETE',
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
      // Some APIs return plain text for delete
      data = { response: responseText };
    }

    console.log('Delete response:', data);

    // Delete from database if instance_id is provided
    if (instance_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: dbError } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', instance_id);

      if (dbError) {
        console.error('Database delete error:', dbError);
      } else {
        console.log('Instance deleted from database');
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Instância deletada', data }),
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
