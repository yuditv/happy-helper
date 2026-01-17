// Uazapi QR Code - Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token da instância é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Getting QR Code for token: ${token.substring(0, 10)}...`);

    const response = await fetch(`${UAZAPI_BASE_URL}/instance/qrcode`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
    });

    const data = await response.json();
    console.log('Uazapi QR response status:', response.status);

    if (!response.ok) {
      console.error('Error from Uazapi:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'Erro ao obter QR Code' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        qrcode: data.qrcode || data.base64 || data,
        pairingCode: data.pairingCode
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error getting QR Code:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
