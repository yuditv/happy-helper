import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  agentId: string;
  message: string;
  sessionId?: string;
  source?: 'web' | 'whatsapp' | 'whatsapp-inbox';
  phone?: string; // Phone number for memory lookup
  metadata?: Record<string, unknown>;
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  choices: Array<{
    message: {
      content: string;
      tool_calls?: Array<{
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
  error?: {
    message: string;
  };
}

interface ExtractedClientInfo {
  client_name?: string;
  nickname?: string;
  device?: string;
  app_name?: string;
  plan_name?: string;
  plan_price?: number;
  custom_info?: Array<{ key: string; value: string }>;
}

// Tool definition for extracting client info
const extractionTools = [{
  type: "function",
  function: {
    name: "save_client_info",
    description: "Salva informações importantes do cliente extraídas da conversa. Use quando o cliente mencionar seu nome, aparelho, plano, aplicativo ou qualquer informação relevante.",
    parameters: {
      type: "object",
      properties: {
        client_name: { type: "string", description: "Nome do cliente" },
        nickname: { type: "string", description: "Apelido ou nome preferido do cliente" },
        device: { type: "string", description: "Aparelho/dispositivo do cliente (ex: TV Box, Celular, Smart TV)" },
        app_name: { type: "string", description: "Nome do aplicativo que o cliente usa" },
        plan_name: { type: "string", description: "Nome ou tipo do plano contratado (ex: Mensal, Anual, Premium)" },
        plan_price: { type: "number", description: "Valor do plano em reais" },
        custom_info: { 
          type: "array",
          description: "Outras informações relevantes sobre o cliente",
          items: {
            type: "object",
            properties: {
              key: { type: "string", description: "Tipo da informação (ex: preferencia_horario, quantidade_tvs)" },
              value: { type: "string", description: "Valor da informação" }
            },
            required: ["key", "value"]
          }
        }
      }
    }
  }
}];

// Function to build client context from memory and client data
function buildClientContext(memory: any, clientData: any): string {
  if (!memory && !clientData) return '';

  const name = memory?.client_name || clientData?.name;
  const nickname = memory?.nickname;
  const device = memory?.device || clientData?.device;
  const appName = memory?.app_name || clientData?.app_name;
  const planName = memory?.plan_name || clientData?.plan;
  const planPrice = memory?.plan_price || clientData?.price;
  const expiresAt = clientData?.expires_at;
  const customMemories = memory?.custom_memories || [];
  const aiSummary = memory?.ai_summary;
  const totalInteractions = memory?.total_interactions || 1;
  const sentiment = memory?.sentiment;
  const isVip = memory?.is_vip;

  let context = `\n\n## INFORMAÇÕES DO CLIENTE (Use para personalizar suas respostas)\n`;
  
  if (name) context += `- Nome: ${name}\n`;
  if (nickname) context += `- Apelido: ${nickname} (prefira usar o apelido)\n`;
  if (device) context += `- Aparelho: ${device}\n`;
  if (appName) context += `- Aplicativo: ${appName}\n`;
  if (planName) context += `- Plano: ${planName}\n`;
  if (planPrice) context += `- Valor: R$ ${planPrice}\n`;
  if (expiresAt) context += `- Vencimento: ${new Date(expiresAt).toLocaleDateString('pt-BR')}\n`;
  if (totalInteractions > 1) context += `- Interações anteriores: ${totalInteractions}\n`;
  if (isVip) context += `- Cliente VIP: Sim (trate com atenção especial)\n`;
  if (sentiment && sentiment !== 'neutral') context += `- Sentimento detectado: ${sentiment}\n`;

  if (customMemories.length > 0) {
    context += `\n### Memórias Adicionais:\n`;
    for (const mem of customMemories) {
      context += `- ${mem.key}: ${mem.value}\n`;
    }
  }

  if (aiSummary) {
    context += `\n### Resumo do Cliente:\n${aiSummary}\n`;
  }

  context += `\nIMPORTANTE: Use essas informações para personalizar suas respostas. `;
  context += `Sempre chame o cliente pelo nome/apelido quando souber. `;
  context += `Demonstre que você lembra das informações anteriores.\n`;

  return context;
}

// Function to save/update client memory
async function saveClientMemory(
  supabaseAdmin: any,
  userId: string,
  agentId: string,
  phone: string,
  extractedInfo: ExtractedClientInfo,
  existingMemory: any
) {
  try {
    const now = new Date().toISOString();
    
    // Build custom memories array
    let customMemories = existingMemory?.custom_memories || [];
    if (extractedInfo.custom_info && extractedInfo.custom_info.length > 0) {
      for (const info of extractedInfo.custom_info) {
        const existingIdx = customMemories.findIndex((m: any) => m.key === info.key);
        const newMem = { key: info.key, value: info.value, extracted_at: now };
        if (existingIdx >= 0) {
          customMemories[existingIdx] = newMem;
        } else {
          customMemories.push(newMem);
        }
      }
    }

    const memoryData = {
      user_id: userId,
      agent_id: agentId,
      phone: phone,
      client_name: extractedInfo.client_name || existingMemory?.client_name,
      nickname: extractedInfo.nickname || existingMemory?.nickname,
      device: extractedInfo.device || existingMemory?.device,
      app_name: extractedInfo.app_name || existingMemory?.app_name,
      plan_name: extractedInfo.plan_name || existingMemory?.plan_name,
      plan_price: extractedInfo.plan_price || existingMemory?.plan_price,
      custom_memories: customMemories,
      last_interaction_at: now,
      total_interactions: (existingMemory?.total_interactions || 0) + 1,
      updated_at: now,
    };

    const { error } = await supabaseAdmin
      .from('ai_client_memories')
      .upsert(memoryData, { onConflict: 'user_id,agent_id,phone' });

    if (error) {
      console.error('[ai-agent-chat] Error saving memory:', error);
    } else {
      console.log('[ai-agent-chat] Memory saved successfully for phone:', phone);
    }
  } catch (err) {
    console.error('[ai-agent-chat] Error in saveClientMemory:', err);
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    // Create admin client for fetching agent data (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body first to check source
    const body: ChatRequest = await req.json();
    const { agentId, message, sessionId, source = 'web', phone, metadata = {} } = body;

    // Check if this is an internal call from whatsapp-inbox-webhook
    const isInternalCall = source === 'whatsapp-inbox' || source === 'whatsapp';
    const isServiceRoleKey = token === supabaseServiceKey;

    let userId: string;
    let supabaseUser;

    if (isInternalCall && isServiceRoleKey) {
      // Internal webhook call - bypass user auth, use service role for DB operations
      console.log(`[ai-agent-chat] Internal webhook call detected for agent: ${agentId}`);
      
      // Fetch agent to get created_by as the user context
      const { data: agentForUser } = await supabaseAdmin
        .from('ai_agents')
        .select('created_by')
        .eq('id', agentId)
        .single();
      
      userId = agentForUser?.created_by || '';
      if (!userId) {
        console.error('[ai-agent-chat] Could not determine user context for internal call');
        return new Response(
          JSON.stringify({ error: 'Could not determine user context' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Use admin client for internal calls
      supabaseUser = supabaseAdmin;
      console.log(`[ai-agent-chat] Using agent owner as user context: ${userId}`);
    } else {
      // Normal web/chat call - require user authentication
      supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader || '' } }
      });

      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
      if (authError || !user) {
        console.error('[ai-agent-chat] Auth error:', authError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = user.id;
    }

    console.log(`[ai-agent-chat] Processing chat request for agent: ${agentId}, user: ${userId}, source: ${source}, phone: ${phone || 'N/A'}`);

    if (!agentId || !message) {
      return new Response(
        JSON.stringify({ error: 'agentId and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch agent details (using admin client to get all fields)
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .eq('is_active', true)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found:', agentError);
      return new Response(
        JSON.stringify({ error: 'Agent not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if agent is enabled for the source
    if (source === 'web' && !agent.is_chat_enabled) {
      return new Response(
        JSON.stringify({ error: 'Agent is not enabled for web chat' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (source === 'whatsapp' && !agent.is_whatsapp_enabled) {
      return new Response(
        JSON.stringify({ error: 'Agent is not enabled for WhatsApp' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate or use provided session ID
    const chatSessionId = sessionId || crypto.randomUUID();

    // ============ MEMORY SYSTEM ============
    let clientContext = '';
    let existingMemory: any = null;
    let clientData: any = null;

    if (agent.memory_enabled && phone) {
      console.log(`[ai-agent-chat] Memory enabled, fetching context for phone: ${phone}`);
      
      // Fetch existing memory for this phone
      const { data: memoryData } = await supabaseAdmin
        .from('ai_client_memories')
        .select('*')
        .eq('phone', phone)
        .eq('agent_id', agentId)
        .maybeSingle();
      
      existingMemory = memoryData;

      // If memory_sync_clients is enabled, also fetch from clients table
      if (agent.memory_sync_clients) {
        // Try multiple phone formats for matching
        const phoneVariants = [
          phone,
          phone.replace(/\D/g, ''),
          phone.startsWith('55') ? phone.slice(2) : `55${phone}`,
        ];

        const { data: clientResult } = await supabaseAdmin
          .from('clients')
          .select('*')
          .or(phoneVariants.map(p => `whatsapp.ilike.%${p}%`).join(','))
          .eq('user_id', userId)
          .maybeSingle();
        
        clientData = clientResult;
      }

      // Build context string
      clientContext = buildClientContext(existingMemory, clientData);
      
      if (clientContext) {
        console.log(`[ai-agent-chat] Client context loaded for phone: ${phone}`);
      }
    }

    // Save user message to database
    const { error: saveUserMsgError } = await supabaseUser
      .from('ai_chat_messages')
      .insert({
        agent_id: agentId,
        user_id: userId,
        session_id: chatSessionId,
        role: 'user',
        content: message,
        metadata: { source, phone, ...metadata }
      });

    if (saveUserMsgError) {
      console.error('Error saving user message:', saveUserMsgError);
    }

    let assistantResponse = '';
    let aiError = null;
    let extractedInfo: ExtractedClientInfo | null = null;

    // Check if using native AI (Lovable AI Gateway with Gemini) or external webhook
    if (agent.use_native_ai) {
      // ============ NATIVE AI INTEGRATION (LOVABLE AI GATEWAY - GEMINI) ============
      const defaultModel = 'google/gemini-2.5-flash';
      const modelToUse = agent.ai_model || defaultModel;
      console.log(`Using Lovable AI Gateway with model: ${modelToUse}`);
      
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      if (!LOVABLE_API_KEY) {
        console.error('LOVABLE_API_KEY not configured');
        aiError = 'Lovable AI API key not configured';
        assistantResponse = 'Desculpe, o serviço de IA não está configurado corretamente. Contate o administrador.';
      } else {
        try {
          // Fetch conversation history for context
          const { data: history } = await supabaseAdmin
            .from('ai_chat_messages')
            .select('role, content')
            .eq('session_id', chatSessionId)
            .order('created_at', { ascending: true })
            .limit(20);

          // Build system prompt with client context
          const baseSystemPrompt = agent.system_prompt || 'Você é um assistente útil e prestativo. Responda sempre em português brasileiro.';
          const enrichedSystemPrompt = baseSystemPrompt + clientContext;

          // Build messages array with system prompt and history
          const messages: AIMessage[] = [
            { role: 'system', content: enrichedSystemPrompt },
          ];

          // Add history (excluding the message we just saved)
          if (history && history.length > 0) {
            for (const msg of history) {
              // Skip the last user message since we'll add it fresh
              if (msg.role === 'user' && msg.content === message) continue;
              messages.push({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
              });
            }
          }

          // Add current user message
          messages.push({ role: 'user', content: message });

          console.log(`Sending ${messages.length} messages to Lovable AI Gateway`);

          // Prepare request body
          const requestBody: any = {
            model: modelToUse,
            messages,
            temperature: 0.7,
            max_tokens: 1000
          };

          // Add extraction tools if memory auto-extract is enabled
          if (agent.memory_enabled && agent.memory_auto_extract && phone) {
            requestBody.tools = extractionTools;
            requestBody.tool_choice = "auto";
          }

          // Call Lovable AI Gateway (supports Gemini models)
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('Lovable AI Gateway error:', aiResponse.status, errorText);
            
            // Handle specific error codes
            if (aiResponse.status === 429) {
              aiError = 'Rate limit exceeded';
              assistantResponse = 'Desculpe, estamos com muitas requisições no momento. Por favor, tente novamente em alguns segundos.';
            } else if (aiResponse.status === 402) {
              aiError = 'Payment required';
              assistantResponse = 'Desculpe, os créditos de IA estão esgotados. Contate o administrador.';
            } else {
              aiError = `AI Gateway returned status ${aiResponse.status}`;
              assistantResponse = 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente mais tarde.';
            }
          } else {
            const aiData: AIResponse = await aiResponse.json();
            
            if (aiData.error) {
              console.error('AI error:', aiData.error);
              aiError = aiData.error.message;
              assistantResponse = 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';
            } else if (aiData.choices && aiData.choices.length > 0) {
              const choice = aiData.choices[0];
              assistantResponse = choice.message.content || '';
              
              // Check for tool calls (memory extraction)
              if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
                for (const toolCall of choice.message.tool_calls) {
                  if (toolCall.function.name === 'save_client_info') {
                    try {
                      extractedInfo = JSON.parse(toolCall.function.arguments) as ExtractedClientInfo;
                      console.log('[ai-agent-chat] Extracted client info:', extractedInfo);
                    } catch (parseErr) {
                      console.error('[ai-agent-chat] Error parsing tool call arguments:', parseErr);
                    }
                  }
                }
              }
              
              console.log('Lovable AI Gateway response received successfully');
            } else {
              aiError = 'No response from AI';
              assistantResponse = 'Desculpe, não recebi uma resposta válida. Por favor, tente novamente.';
            }
          }
        } catch (fetchError: unknown) {
          console.error('Error calling Lovable AI Gateway:', fetchError);
          aiError = fetchError instanceof Error ? fetchError.message : 'Unknown error';
          assistantResponse = 'Desculpe, não foi possível conectar ao serviço de IA. Por favor, tente novamente.';
        }
      }
    } else {
      // ============ EXTERNAL WEBHOOK (n8n) ============
      if (!agent.webhook_url) {
        console.error('No webhook URL configured for non-native agent');
        aiError = 'Webhook URL not configured';
        assistantResponse = 'Desculpe, este agente não está configurado corretamente. Contate o administrador.';
      } else {
        console.log(`Calling external webhook: ${agent.webhook_url}`);
        
        try {
          // Include client context in webhook payload
          const n8nResponse = await fetch(agent.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message,
              sessionId: chatSessionId,
              userId: userId,
              source,
              phone,
              agentName: agent.name,
              clientContext: existingMemory || clientData ? {
                name: existingMemory?.client_name || clientData?.name,
                nickname: existingMemory?.nickname,
                device: existingMemory?.device || clientData?.device,
                appName: existingMemory?.app_name || clientData?.app_name,
                planName: existingMemory?.plan_name || clientData?.plan,
                customMemories: existingMemory?.custom_memories || [],
              } : null,
              metadata: {
                ...metadata,
              }
            }),
          });

          if (!n8nResponse.ok) {
            const errorText = await n8nResponse.text();
            console.error('Webhook error:', n8nResponse.status, errorText);
            aiError = `Webhook returned status ${n8nResponse.status}`;
            assistantResponse = 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente mais tarde.';
          } else {
            const n8nData = await n8nResponse.json();
            console.log('Webhook response:', n8nData);
            
            // n8n can return response in different formats
            assistantResponse = 
              n8nData.response || 
              n8nData.message || 
              n8nData.output || 
              n8nData.text ||
              n8nData.reply ||
              (typeof n8nData === 'string' ? n8nData : JSON.stringify(n8nData));
            
            // n8n can also return extracted info
            if (n8nData.extractedInfo) {
              extractedInfo = n8nData.extractedInfo as ExtractedClientInfo;
            }
          }
        } catch (fetchError: unknown) {
          console.error('Error calling webhook:', fetchError);
          aiError = fetchError instanceof Error ? fetchError.message : 'Unknown error';
          assistantResponse = 'Desculpe, não foi possível conectar ao agente. Por favor, tente novamente.';
        }
      }
    }

    // ============ SAVE EXTRACTED MEMORY ============
    if (agent.memory_enabled && phone && extractedInfo) {
      // Check if any info was actually extracted
      const hasInfo = extractedInfo.client_name || 
                      extractedInfo.nickname || 
                      extractedInfo.device || 
                      extractedInfo.app_name || 
                      extractedInfo.plan_name || 
                      extractedInfo.plan_price ||
                      (extractedInfo.custom_info && extractedInfo.custom_info.length > 0);
      
      if (hasInfo) {
        await saveClientMemory(supabaseAdmin, userId, agentId, phone, extractedInfo, existingMemory);
      }
    } else if (agent.memory_enabled && phone && !existingMemory) {
      // Create initial memory record to track interaction count
      await saveClientMemory(supabaseAdmin, userId, agentId, phone, {}, null);
    } else if (agent.memory_enabled && phone && existingMemory) {
      // Update interaction count
      await supabaseAdmin
        .from('ai_client_memories')
        .update({
          last_interaction_at: new Date().toISOString(),
          total_interactions: (existingMemory.total_interactions || 0) + 1,
        })
        .eq('id', existingMemory.id);
    }

    // Save assistant response to database
    const { data: savedMessage, error: saveAssistantMsgError } = await supabaseUser
      .from('ai_chat_messages')
      .insert({
        agent_id: agentId,
        user_id: userId,
        session_id: chatSessionId,
        role: 'assistant',
        content: assistantResponse,
        metadata: { 
          source, 
          phone,
          error: aiError,
          model: agent.use_native_ai ? agent.ai_model : 'webhook',
          extractedInfo: extractedInfo || undefined,
          ...metadata
        }
      })
      .select()
      .single();

    if (saveAssistantMsgError) {
      console.error('Error saving assistant message:', saveAssistantMsgError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: chatSessionId,
        message: {
          id: savedMessage?.id,
          role: 'assistant',
          content: assistantResponse,
          created_at: savedMessage?.created_at || new Date().toISOString()
        },
        extractedInfo,
        error: aiError
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
