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
    };
  }>;
  error?: {
    message: string;
  };
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
    const { agentId, message, sessionId, source = 'web', metadata = {} } = body;

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

    console.log(`[ai-agent-chat] Processing chat request for agent: ${agentId}, user: ${userId}, source: ${source}`);

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

    // Save user message to database
    const { error: saveUserMsgError } = await supabaseUser
      .from('ai_chat_messages')
      .insert({
        agent_id: agentId,
        user_id: userId,
        session_id: chatSessionId,
        role: 'user',
        content: message,
        metadata: { source, ...metadata }
      });

    if (saveUserMsgError) {
      console.error('Error saving user message:', saveUserMsgError);
    }

    let assistantResponse = '';
    let aiError = null;

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

          // Build messages array with system prompt and history
          const messages: AIMessage[] = [
            { 
              role: 'system', 
              content: agent.system_prompt || 'Você é um assistente útil e prestativo. Responda sempre em português brasileiro.' 
            },
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

          // Call Lovable AI Gateway (supports Gemini models)
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelToUse,
              messages,
              temperature: 0.7,
              max_tokens: 1000
            })
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
              assistantResponse = aiData.choices[0].message.content;
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
              agentName: agent.name,
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
          }
        } catch (fetchError: unknown) {
          console.error('Error calling webhook:', fetchError);
          aiError = fetchError instanceof Error ? fetchError.message : 'Unknown error';
          assistantResponse = 'Desculpe, não foi possível conectar ao agente. Por favor, tente novamente.';
        }
      }
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
          error: aiError,
          model: agent.use_native_ai ? agent.ai_model : 'webhook',
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
