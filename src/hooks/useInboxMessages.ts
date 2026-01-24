import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'contact' | 'agent' | 'ai' | 'system';
  sender_id: string | null;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  is_private: boolean;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useInboxMessages(conversationId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_inbox_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }) as { data: ChatMessage[] | null; error: unknown };

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const sendMessage = async (content: string, isPrivate = false, mediaUrl?: string, mediaType?: string) => {
    if (!conversationId || (!content.trim() && !mediaUrl)) return false;

    // Create optimistic message with 'sending' status
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_type: 'agent',
      sender_id: user?.id || null,
      content: content.trim() || null,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
      is_private: isPrivate,
      is_read: false,
      metadata: { status: 'sending', sent_by: user?.email || 'Atendente' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://tlanmmbgyyxuqvezudir.supabase.co/functions/v1/send-inbox-message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            conversationId,
            content,
            isPrivate,
            mediaUrl,
            mediaType
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      // Update optimistic message with 'sent' status
      setMessages(prev => 
        prev.map(m => m.id === optimisticId 
          ? { ...m, metadata: { ...m.metadata, status: 'sent' } }
          : m
        )
      );

      // Real message will replace via realtime subscription
      return true;
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      
      // Update optimistic message to show failure
      setMessages(prev => 
        prev.map(m => m.id === optimisticId 
          ? { ...m, metadata: { ...m.metadata, status: 'failed', send_error: true } }
          : m
        )
      );
      
      toast({
        title: 'Erro ao enviar mensagem',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  // Fetch messages when conversation changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!conversationId) return;

    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_inbox_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_inbox_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => 
            prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId]);

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    refetch: fetchMessages
  };
}
