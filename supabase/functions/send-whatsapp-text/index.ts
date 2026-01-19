const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length <= 11 ? `55${digits}` : digits;
}

Deno.serve(async (req: Request): Promise<Response> => {
  console.log("send-whatsapp-text called, method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const uazapiUrl = Deno.env.get("UAZAPI_URL");
    const uazapiToken = Deno.env.get("UAZAPI_TOKEN");

    console.log("UAZAPI_URL:", uazapiUrl ? "SET" : "MISSING");
    console.log("UAZAPI_TOKEN:", uazapiToken ? "SET" : "MISSING");

    if (!uazapiUrl || !uazapiToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Configuração UAZAPI ausente" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const { phone, message } = body;

    console.log("Phone:", phone);
    console.log("Message length:", message?.length);

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone e message são obrigatórios" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedPhone = formatPhone(phone);
    console.log("Formatted phone:", formattedPhone);

    const endpoint = uazapiUrl.replace(/\/+$/, '') + "/message/text";
    console.log("Calling:", endpoint);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${uazapiToken}`,
      },
      body: JSON.stringify({ phone: formattedPhone, message }),
    });

    const responseText = await response.text();
    console.log("Uazapi status:", response.status);
    console.log("Uazapi response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: "Erro na API Uazapi", details: data }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
