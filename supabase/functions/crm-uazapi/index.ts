import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CRMLeadData {
  name?: string;
  fullName?: string;
  email?: string;
  personalId?: string;
  status?: string;
  notes?: string;
  kanbanOrder?: number;
  isTicketOpen?: boolean;
  attendantId?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

interface CRMFieldConfig {
  fieldKey: string;
  fieldName: string;
  fieldType: string;
  fieldOptions?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const uazapiUrl = Deno.env.get("UAZAPI_URL")!;
    const uazapiToken = Deno.env.get("UAZAPI_TOKEN")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { action, instanceId, phone, data, fieldConfigs } = await req.json();

    console.log(`[CRM-UAZAPI] Action: ${action}, Instance: ${instanceId}, Phone: ${phone}`);

    // Get instance key if instanceId provided
    let instanceKey: string | null = null;
    if (instanceId) {
      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("instance_key")
        .eq("id", instanceId)
        .single();
      instanceKey = instance?.instance_key;
    }

    switch (action) {
      case "get_fields_map": {
        // Get field configuration from UAZAPI
        if (!instanceKey) {
          throw new Error("Instance key not found");
        }

        const response = await fetch(`${uazapiUrl}/instance/getFieldsMap`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "token": instanceKey,
          },
        });

        const uazapiData = await response.json();
        console.log("[CRM-UAZAPI] Fields map from UAZAPI:", uazapiData);

        return new Response(JSON.stringify({ success: true, data: uazapiData }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_fields_map": {
        // Update field configuration in UAZAPI
        if (!instanceKey) {
          throw new Error("Instance key not found");
        }

        const fieldsPayload: Record<string, string> = {};
        (fieldConfigs as CRMFieldConfig[]).forEach((field) => {
          fieldsPayload[field.fieldKey] = field.fieldName;
        });

        console.log("[CRM-UAZAPI] Updating fields map:", fieldsPayload);

        const response = await fetch(`${uazapiUrl}/instance/updateFieldsMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": instanceKey,
          },
          body: JSON.stringify(fieldsPayload),
        });

        const uazapiData = await response.json();

        // Save to local database
        if (userId) {
          for (const field of fieldConfigs as CRMFieldConfig[]) {
            await supabase.from("crm_fields_config").upsert({
              user_id: userId,
              instance_id: instanceId,
              field_key: field.fieldKey,
              field_name: field.fieldName,
              field_type: field.fieldType || "text",
              field_options: field.fieldOptions || [],
              is_active: true,
            }, {
              onConflict: "user_id,instance_id,field_key",
            });
          }
        }

        return new Response(JSON.stringify({ success: true, data: uazapiData }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_lead": {
        // Get lead data - first try local, then sync from conversation
        if (!phone || !instanceId || !userId) {
          throw new Error("Phone, instanceId and userId are required");
        }

        const { data: leadData, error } = await supabase
          .from("crm_lead_data")
          .select("*")
          .eq("phone", phone)
          .eq("instance_id", instanceId)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        return new Response(JSON.stringify({ success: true, data: leadData }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_lead": {
        // Update lead data locally and sync to UAZAPI
        if (!phone || !instanceId || !userId) {
          throw new Error("Phone, instanceId and userId are required");
        }

        const leadData = data as CRMLeadData;

        // Build UAZAPI payload
        const uazapiPayload: Record<string, unknown> = {
          id: phone.includes("@") ? phone : `${phone}@s.whatsapp.net`,
        };

        if (leadData.name !== undefined) uazapiPayload.lead_name = leadData.name;
        if (leadData.fullName !== undefined) uazapiPayload.lead_fullName = leadData.fullName;
        if (leadData.email !== undefined) uazapiPayload.lead_email = leadData.email;
        if (leadData.personalId !== undefined) uazapiPayload.lead_personalId = leadData.personalId;
        if (leadData.status !== undefined) uazapiPayload.lead_status = leadData.status;
        if (leadData.notes !== undefined) uazapiPayload.lead_notes = leadData.notes;
        if (leadData.kanbanOrder !== undefined) uazapiPayload.lead_kanbanOrder = leadData.kanbanOrder;
        if (leadData.isTicketOpen !== undefined) uazapiPayload.lead_isTicketOpen = leadData.isTicketOpen;
        if (leadData.attendantId !== undefined) uazapiPayload.lead_assignedAttendant_id = leadData.attendantId;
        if (leadData.tags !== undefined) uazapiPayload.lead_tags = leadData.tags;

        // Add custom fields
        if (leadData.customFields) {
          Object.entries(leadData.customFields).forEach(([key, value]) => {
            uazapiPayload[key] = value;
          });
        }

        console.log("[CRM-UAZAPI] Updating lead in UAZAPI:", uazapiPayload);

        // Call UAZAPI to update lead
        if (instanceKey) {
          try {
            const response = await fetch(`${uazapiUrl}/chat/editLead`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "token": instanceKey,
              },
              body: JSON.stringify(uazapiPayload),
            });

            const uazapiResult = await response.json();
            console.log("[CRM-UAZAPI] UAZAPI response:", uazapiResult);
          } catch (uazapiError) {
            console.error("[CRM-UAZAPI] Error calling UAZAPI:", uazapiError);
          }
        }

        // Save to local database
        const { data: savedLead, error } = await supabase
          .from("crm_lead_data")
          .upsert({
            user_id: userId,
            phone: phone.replace("@s.whatsapp.net", ""),
            instance_id: instanceId,
            lead_name: leadData.name,
            lead_full_name: leadData.fullName,
            lead_email: leadData.email,
            lead_personal_id: leadData.personalId,
            lead_status: leadData.status,
            lead_notes: leadData.notes,
            lead_kanban_order: leadData.kanbanOrder,
            is_ticket_open: leadData.isTicketOpen,
            custom_fields: leadData.customFields || {},
            synced_at: new Date().toISOString(),
          }, {
            onConflict: "phone,instance_id",
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return new Response(JSON.stringify({ success: true, data: savedLead }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_lead": {
        // Sync lead from UAZAPI to local database
        if (!phone || !instanceId || !instanceKey || !userId) {
          throw new Error("Phone, instanceId and instanceKey are required");
        }

        // Get chat info from UAZAPI which includes lead data
        const response = await fetch(`${uazapiUrl}/chat/findChats`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": instanceKey,
          },
          body: JSON.stringify({
            id: phone.includes("@") ? phone : `${phone}@s.whatsapp.net`,
          }),
        });

        const chatData = await response.json();
        console.log("[CRM-UAZAPI] Chat data from UAZAPI:", chatData);

        if (chatData && chatData.length > 0) {
          const chat = chatData[0];
          
          // Extract custom fields
          const customFields: Record<string, string> = {};
          for (let i = 1; i <= 20; i++) {
            const key = `lead_field${i.toString().padStart(2, "0")}`;
            if (chat[key]) {
              customFields[key] = chat[key];
            }
          }

          const { data: savedLead, error } = await supabase
            .from("crm_lead_data")
            .upsert({
              user_id: userId,
              phone: phone.replace("@s.whatsapp.net", ""),
              instance_id: instanceId,
              lead_name: chat.lead_name,
              lead_full_name: chat.lead_fullName,
              lead_email: chat.lead_email,
              lead_personal_id: chat.lead_personalId,
              lead_status: chat.lead_status,
              lead_notes: chat.lead_notes,
              lead_kanban_order: chat.lead_kanbanOrder,
              is_ticket_open: chat.lead_isTicketOpen,
              custom_fields: customFields,
              synced_at: new Date().toISOString(),
            }, {
              onConflict: "phone,instance_id",
            })
            .select()
            .single();

          if (error) {
            throw error;
          }

          return new Response(JSON.stringify({ success: true, data: savedLead }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, data: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_field_configs": {
        // Get local field configurations
        if (!userId) {
          throw new Error("User not authenticated");
        }

        const { data: configs, error } = await supabase
          .from("crm_fields_config")
          .select("*")
          .eq("user_id", userId)
          .eq("instance_id", instanceId)
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (error) {
          throw error;
        }

        return new Response(JSON.stringify({ success: true, data: configs }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[CRM-UAZAPI] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});