import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaintenanceStats {
  memoriesCount: number;
  chatMessagesCount: number;
  buffersCount: number;
  oldDataCount: number;
}

export function useAIMaintenance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch stats
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refreshStats,
  } = useQuery({
    queryKey: ['ai-maintenance-stats'],
    queryFn: async (): Promise<MaintenanceStats> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      // Fetch all counts in parallel
      const [memoriesRes, chatRes, buffersRes, oldMemoriesRes, oldChatRes] = await Promise.all([
        supabase.from('ai_client_memories').select('id', { count: 'exact', head: true }),
        supabase.from('ai_chat_messages').select('id', { count: 'exact', head: true }),
        supabase.from('ai_message_buffer').select('id', { count: 'exact', head: true }),
        supabase.from('ai_client_memories').select('id', { count: 'exact', head: true }).lt('updated_at', thirtyDaysAgoISO),
        supabase.from('ai_chat_messages').select('id', { count: 'exact', head: true }).lt('created_at', thirtyDaysAgoISO),
      ]);

      return {
        memoriesCount: memoriesRes.count || 0,
        chatMessagesCount: chatRes.count || 0,
        buffersCount: buffersRes.count || 0,
        oldDataCount: (oldMemoriesRes.count || 0) + (oldChatRes.count || 0),
      };
    },
  });

  // Clear memories
  const clearMemories = useMutation({
    mutationFn: async ({ oldOnly, daysOld }: { oldOnly: boolean; daysOld: number }) => {
      console.log('[Maintenance] Clearing memories:', { oldOnly, daysOld });
      
      if (oldOnly) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const { error, count } = await supabase
          .from('ai_client_memories')
          .delete({ count: 'exact' })
          .lt('updated_at', cutoffDate.toISOString());
        
        console.log('[Maintenance] Deleted old memories:', count);
        if (error) throw error;
      } else {
        // Delete all - need to select first to get IDs, then delete
        const { data: memories } = await supabase
          .from('ai_client_memories')
          .select('id');
        
        if (memories && memories.length > 0) {
          const ids = memories.map(m => m.id);
          const { error, count } = await supabase
            .from('ai_client_memories')
            .delete({ count: 'exact' })
            .in('id', ids);
          
          console.log('[Maintenance] Deleted all memories:', count);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-maintenance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['ai-client-memories'] });
      toast({
        title: 'Memórias limpas',
        description: 'As memórias de clientes foram removidas com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error clearing memories:', error);
      toast({
        title: 'Erro ao limpar memórias',
        description: 'Não foi possível remover as memórias.',
        variant: 'destructive',
      });
    },
  });

  // Clear chat history
  const clearChatHistory = useMutation({
    mutationFn: async ({ oldOnly, daysOld }: { oldOnly: boolean; daysOld: number }) => {
      console.log('[Maintenance] Clearing chat history:', { oldOnly, daysOld });
      
      if (oldOnly) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const { error, count } = await supabase
          .from('ai_chat_messages')
          .delete({ count: 'exact' })
          .lt('created_at', cutoffDate.toISOString());
        
        console.log('[Maintenance] Deleted old chat messages:', count);
        if (error) throw error;
      } else {
        // Delete all
        const { data: messages } = await supabase
          .from('ai_chat_messages')
          .select('id');
        
        if (messages && messages.length > 0) {
          const ids = messages.map(m => m.id);
          const { error, count } = await supabase
            .from('ai_chat_messages')
            .delete({ count: 'exact' })
            .in('id', ids);
          
          console.log('[Maintenance] Deleted all chat messages:', count);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-maintenance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-messages'] });
      toast({
        title: 'Histórico limpo',
        description: 'O histórico de chat foi removido com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error clearing chat history:', error);
      toast({
        title: 'Erro ao limpar histórico',
        description: 'Não foi possível remover o histórico de chat.',
        variant: 'destructive',
      });
    },
  });

  // Clear message buffers
  const clearMessageBuffers = useMutation({
    mutationFn: async () => {
      console.log('[Maintenance] Clearing message buffers');
      
      // Get all buffer IDs first, then delete by IDs
      const { data: buffers } = await supabase
        .from('ai_message_buffer')
        .select('id');
      
      if (buffers && buffers.length > 0) {
        const ids = buffers.map(b => b.id);
        const { error, count } = await supabase
          .from('ai_message_buffer')
          .delete({ count: 'exact' })
          .in('id', ids);
        
        console.log('[Maintenance] Deleted buffers:', count);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-maintenance-stats'] });
      toast({
        title: 'Buffers limpos',
        description: 'Os buffers de mensagens foram removidos com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error clearing buffers:', error);
      toast({
        title: 'Erro ao limpar buffers',
        description: 'Não foi possível remover os buffers.',
        variant: 'destructive',
      });
    },
  });

  // Clear all data
  const clearAllData = useMutation({
    mutationFn: async ({ oldOnly, daysOld }: { oldOnly: boolean; daysOld: number }) => {
      console.log('[Maintenance] Clearing all data:', { oldOnly, daysOld });
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffISO = cutoffDate.toISOString();

      if (oldOnly) {
        // Delete old data with proper conditions
        const [memoriesRes, chatRes, buffersRes] = await Promise.all([
          supabase.from('ai_client_memories').delete({ count: 'exact' }).lt('updated_at', cutoffISO),
          supabase.from('ai_chat_messages').delete({ count: 'exact' }).lt('created_at', cutoffISO),
          supabase.from('ai_message_buffer').delete({ count: 'exact' }).lt('created_at', cutoffISO),
        ]);

        console.log('[Maintenance] Deleted old data:', {
          memories: memoriesRes.count,
          chat: chatRes.count,
          buffers: buffersRes.count,
        });

        const errors = [memoriesRes, chatRes, buffersRes].filter(r => r.error);
        if (errors.length > 0) {
          throw new Error('Alguns dados não puderam ser removidos');
        }
      } else {
        // Delete all - get IDs first for each table
        const [memories, messages, buffers] = await Promise.all([
          supabase.from('ai_client_memories').select('id'),
          supabase.from('ai_chat_messages').select('id'),
          supabase.from('ai_message_buffer').select('id'),
        ]);

        const deletePromises = [];
        
        if (memories.data && memories.data.length > 0) {
          deletePromises.push(
            supabase.from('ai_client_memories').delete({ count: 'exact' }).in('id', memories.data.map(m => m.id))
          );
        }
        
        if (messages.data && messages.data.length > 0) {
          deletePromises.push(
            supabase.from('ai_chat_messages').delete({ count: 'exact' }).in('id', messages.data.map(m => m.id))
          );
        }
        
        if (buffers.data && buffers.data.length > 0) {
          deletePromises.push(
            supabase.from('ai_message_buffer').delete({ count: 'exact' }).in('id', buffers.data.map(b => b.id))
          );
        }

        if (deletePromises.length > 0) {
          const results = await Promise.all(deletePromises);
          console.log('[Maintenance] Deleted all data:', results.map(r => r.count));
          
          const errors = results.filter(r => r.error);
          if (errors.length > 0) {
            throw new Error('Alguns dados não puderam ser removidos');
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-maintenance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['ai-client-memories'] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-messages'] });
      toast({
        title: 'Reset completo',
        description: 'Todos os dados da IA foram removidos com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error clearing all data:', error);
      toast({
        title: 'Erro no reset',
        description: 'Não foi possível remover todos os dados.',
        variant: 'destructive',
      });
    },
  });

  // Reload agent configurations (invalidate cache)
  const reloadAgentConfigs = useMutation({
    mutationFn: async () => {
      // This forces a re-fetch of all agent configurations
      await queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      await queryClient.invalidateQueries({ queryKey: ['ai-agent'] });
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-agent-routing'] });
      await queryClient.invalidateQueries({ queryKey: ['ai-sub-agent-links'] });
      await queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      
      // Small delay to simulate reload
      await new Promise(resolve => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      toast({
        title: 'Configurações recarregadas',
        description: 'Os prompts e configurações dos agentes serão aplicados na próxima mensagem.',
      });
    },
  });

  return {
    stats,
    isLoadingStats,
    refreshStats,
    clearMemories,
    clearChatHistory,
    clearMessageBuffers,
    clearAllData,
    reloadAgentConfigs,
    isClearingMemories: clearMemories.isPending,
    isClearingChat: clearChatHistory.isPending,
    isClearingBuffers: clearMessageBuffers.isPending,
    isClearingAll: clearAllData.isPending,
    isReloading: reloadAgentConfigs.isPending,
  };
}
