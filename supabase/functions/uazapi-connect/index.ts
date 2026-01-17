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
    const { token, phone } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token da instância é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Connecting instance with token: ${token.substring(0, 10)}...`);
    if (phone) {
      console.log(`Requesting pairing code for phone: ${phone}`);
    } else {
      console.log('Requesting QR code');
    }

    // Build request body - if phone is provided, get pairing code, otherwise get QR
    const body = phone ? JSON.stringify({ phone }) : undefined;

    const response = await fetch(`${UAZAPI_URL}/instance/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body,
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

    console.log('Connect response:', data);

    // Return QR code or pairing code based on what was requested
    return new Response(
      JSON.stringify({ 
        success: true, 
        qrcode: data.qrcode || data.qr || null,
        pairingCode: data.paircode || data.pairingCode || null,
        status: data.status,
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
