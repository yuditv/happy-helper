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
  source?: 'web' | 'whatsapp';
  metadata?: Record<string, unknown>;
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
    
    // Create client with user's token for RLS
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // Create admin client for fetching webhook URL (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ChatRequest = await req.json();
    const { agentId, message, sessionId, source = 'web', metadata = {} } = body;

    console.log(`Processing chat request for agent: ${agentId}, user: ${user.id}`);

    if (!agentId || !message) {
      return new Response(
        JSON.stringify({ error: 'agentId and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch agent details (using admin client to get webhook_url)
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
        user_id: user.id,
        session_id: chatSessionId,
        role: 'user',
        content: message,
        metadata: { source, ...metadata }
      });

    if (saveUserMsgError) {
      console.error('Error saving user message:', saveUserMsgError);
    }

    // Call n8n webhook
    console.log(`Calling n8n webhook: ${agent.webhook_url}`);
    
    let assistantResponse = '';
    let n8nError = null;

    try {
      const n8nResponse = await fetch(agent.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId: chatSessionId,
          userId: user.id,
          source,
          agentName: agent.name,
          metadata: {
            ...metadata,
            userEmail: user.email,
          }
        }),
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error('n8n webhook error:', n8nResponse.status, errorText);
        n8nError = `Webhook returned status ${n8nResponse.status}`;
        assistantResponse = 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente mais tarde.';
      } else {
        const n8nData = await n8nResponse.json();
        console.log('n8n response:', n8nData);
        
        // n8n can return response in different formats
        // Try common patterns
        assistantResponse = 
          n8nData.response || 
          n8nData.message || 
          n8nData.output || 
          n8nData.text ||
          n8nData.reply ||
          (typeof n8nData === 'string' ? n8nData : JSON.stringify(n8nData));
      }
    } catch (fetchError: unknown) {
      console.error('Error calling n8n webhook:', fetchError);
      n8nError = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      assistantResponse = 'Desculpe, não foi possível conectar ao agente. Por favor, tente novamente.';
    }

    // Save assistant response to database
    const { data: savedMessage, error: saveAssistantMsgError } = await supabaseUser
      .from('ai_chat_messages')
      .insert({
        agent_id: agentId,
        user_id: user.id,
        session_id: chatSessionId,
        role: 'assistant',
        content: assistantResponse,
        metadata: { 
          source, 
          error: n8nError,
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
        error: n8nError
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
