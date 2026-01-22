// Renewal Reminder Scheduler - Creates scheduled messages for expiring clients
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] === Renewal Reminder Scheduler ===`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with notification settings enabled
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("whatsapp_reminders_enabled", true);

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw settingsError;
    }

    console.log(`Found ${settings?.length || 0} users with WhatsApp reminders enabled`);

    if (!settings || settings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No users with reminders enabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      usersProcessed: 0,
      remindersCreated: 0,
      errors: [] as string[],
    };

    for (const setting of settings) {
      results.usersProcessed++;
      const userId = setting.user_id;
      const reminderDays = setting.reminder_days || [7, 3, 1];

      try {
        // Get clients expiring in the configured days
        const now = new Date();
        
        for (const days of reminderDays) {
          const targetDate = new Date(now);
          targetDate.setDate(targetDate.getDate() + days);
          targetDate.setHours(0, 0, 0, 0);
          
          const nextDay = new Date(targetDate);
          nextDay.setDate(nextDay.getDate() + 1);

          // Find clients expiring on this target date
          const { data: expiringClients, error: clientsError } = await supabase
            .from("clients")
            .select("*")
            .eq("user_id", userId)
            .gte("expires_at", targetDate.toISOString())
            .lt("expires_at", nextDay.toISOString());

          if (clientsError) {
            console.error(`Error fetching clients for user ${userId}:`, clientsError);
            continue;
          }

          if (!expiringClients || expiringClients.length === 0) {
            continue;
          }

          console.log(`Found ${expiringClients.length} clients expiring in ${days} days for user ${userId}`);

          for (const client of expiringClients) {
            // Check if we already sent a reminder for this client/day combination
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            
            const { data: existingNotification } = await supabase
              .from("notification_history")
              .select("id")
              .eq("user_id", userId)
              .eq("client_id", client.id)
              .eq("days_until_expiration", days)
              .gte("created_at", todayStart.toISOString())
              .limit(1);

            if (existingNotification && existingNotification.length > 0) {
              console.log(`Already sent ${days}-day reminder for client ${client.id}`);
              continue;
            }

            // Create the scheduled message
            const message = days === 1
              ? `Olá ${client.name}! Seu plano ${client.plan} vence AMANHÃ. Renove agora para não ficar sem acesso!`
              : days === 3
              ? `Olá ${client.name}! Seu plano ${client.plan} vence em 3 dias. Que tal renovar agora?`
              : `Olá ${client.name}! Seu plano ${client.plan} vence em ${days} dias (${new Date(client.expires_at).toLocaleDateString('pt-BR')}). Renove com antecedência!`;

            const { error: insertError } = await supabase
              .from("scheduled_messages")
              .insert({
                user_id: userId,
                client_id: client.id,
                message_type: "renewal_reminder",
                message_content: message,
                scheduled_at: new Date().toISOString(), // Send immediately
                status: "pending",
              });

            if (insertError) {
              console.error(`Error creating scheduled message:`, insertError);
              results.errors.push(`Client ${client.id}: ${insertError.message}`);
              continue;
            }

            // Record in notification history
            await supabase
              .from("notification_history")
              .insert({
                user_id: userId,
                client_id: client.id,
                notification_type: "whatsapp_reminder",
                days_until_expiration: days,
                subject: `Lembrete de renovação - ${days} dias`,
                status: "pending",
              });

            results.remindersCreated++;
            console.log(`Created reminder for client ${client.name} (${days} days)`);
          }
        }
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        results.errors.push(`User ${userId}: ${String(error)}`);
      }
    }

    console.log(`Processing complete:`, results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
