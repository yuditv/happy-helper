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
      let query = supabase.from('ai_client_memories').delete();

      if (oldOnly) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        query = query.lt('updated_at', cutoffDate.toISOString());
      } else {
        // Need a condition for delete, use user_id is not null (always true)
        query = query.not('id', 'is', null);
      }

      const { error } = await query;
      if (error) throw error;
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
      let query = supabase.from('ai_chat_messages').delete();

      if (oldOnly) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        query = query.lt('created_at', cutoffDate.toISOString());
      } else {
        query = query.not('id', 'is', null);
      }

      const { error } = await query;
      if (error) throw error;
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
      const { error } = await supabase
        .from('ai_message_buffer')
        .delete()
        .not('id', 'is', null);

      if (error) throw error;
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
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffISO = cutoffDate.toISOString();

      // Delete in parallel
      const promises = [];

      if (oldOnly) {
        promises.push(
          supabase.from('ai_client_memories').delete().lt('updated_at', cutoffISO),
          supabase.from('ai_chat_messages').delete().lt('created_at', cutoffISO),
          supabase.from('ai_message_buffer').delete().lt('created_at', cutoffISO)
        );
      } else {
        promises.push(
          supabase.from('ai_client_memories').delete().not('id', 'is', null),
          supabase.from('ai_chat_messages').delete().not('id', 'is', null),
          supabase.from('ai_message_buffer').delete().not('id', 'is', null)
        );
      }

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error('Alguns dados não puderam ser removidos');
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
