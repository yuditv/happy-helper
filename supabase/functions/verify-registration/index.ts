import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate Gmail only
function isValidGmail(email: string): boolean {
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com(\.br)?$/i;
  return gmailRegex.test(email);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, email, code, whatsapp, password } = await req.json();
    
    // Get client IP from headers
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    console.log(`Action: ${action}, Email: ${email}, IP: ${clientIP}`);

    // ACTION: Send verification code
    if (action === "send_code") {
      // Validate Gmail
      if (!isValidGmail(email)) {
        return new Response(
          JSON.stringify({ error: "Apenas emails do Gmail são aceitos (@gmail.com ou @gmail.com.br)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if IP already registered an account
      const { data: existingIP } = await supabaseAdmin
        .from("registration_ips")
        .select("id")
        .eq("ip_address", clientIP)
        .single();

      if (existingIP) {
        return new Response(
          JSON.stringify({ error: "Este dispositivo/rede já possui uma conta cadastrada. Apenas uma conta por IP é permitida." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if email already registered in auth
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (existingUser) {
        return new Response(
          JSON.stringify({ error: "Este email já está cadastrado. Faça login." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate and store verification code
      const verificationCode = generateCode();
      
      // Delete any existing codes for this email
      await supabaseAdmin
        .from("email_verification_codes")
        .delete()
        .eq("email", email.toLowerCase());

      // Insert new code
      const { error: insertError } = await supabaseAdmin
        .from("email_verification_codes")
        .insert({
          email: email.toLowerCase(),
          code: verificationCode,
          ip_address: clientIP,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
        });

      if (insertError) {
        console.error("Error inserting code:", insertError);
        throw new Error("Erro ao gerar código de verificação");
      }

      // Send email with code
      const { error: emailError } = await resend.emails.send({
        from: "Gerenciador de Clientes <noreply@resend.dev>",
        to: [email],
        subject: "Código de Verificação - Gerenciador de Clientes",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Código de Verificação</h1>
            <p style="color: #666; font-size: 16px;">Olá! Seu código de verificação para criar sua conta é:</p>
            <div style="background: #f4f4f4; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${verificationCode}</span>
            </div>
            <p style="color: #999; font-size: 14px;">Este código expira em 15 minutos.</p>
            <p style="color: #999; font-size: 14px;">Se você não solicitou este código, ignore este email.</p>
          </div>
        `
      });

      if (emailError) {
        console.error("Error sending email:", emailError);
        throw new Error("Erro ao enviar email de verificação");
      }

      console.log(`Verification code sent to ${email}`);
      return new Response(
        JSON.stringify({ success: true, message: "Código de verificação enviado para seu email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: Verify code and create account
    if (action === "verify_and_register") {
      if (!code || !password || !whatsapp) {
        return new Response(
          JSON.stringify({ error: "Dados incompletos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check verification code
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from("email_verification_codes")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("code", code)
        .is("verified_at", null)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (codeError || !codeData) {
        return new Response(
          JSON.stringify({ error: "Código inválido ou expirado. Solicite um novo código." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Double check IP again
      const { data: existingIP } = await supabaseAdmin
        .from("registration_ips")
        .select("id")
        .eq("ip_address", clientIP)
        .single();

      if (existingIP) {
        return new Response(
          JSON.stringify({ error: "Este dispositivo/rede já possui uma conta cadastrada." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create user account
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true, // Auto confirm since we verified via code
        user_metadata: { whatsapp }
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark code as verified
      await supabaseAdmin
        .from("email_verification_codes")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", codeData.id);

      // Register IP
      await supabaseAdmin
        .from("registration_ips")
        .insert({
          ip_address: clientIP,
          user_id: newUser.user.id
        });

      console.log(`User created: ${email}, IP registered: ${clientIP}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Conta criada com sucesso! Você já pode fazer login." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});