import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface BotProxyConfig {
  id: string;
  user_id: string;
  bot_phone: string;
  trigger_label_id: string | null;
  instance_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotProxySession {
  id: string;
  config_id: string;
  client_conversation_id: string | null;
  bot_conversation_id: string | null;
  client_phone: string;
  is_active: boolean;
  created_at: string;
  last_activity_at: string;
}

export function useBotProxy() {
  const { user } = useAuth();
  const [config, setConfig] = useState<BotProxyConfig | null>(null);
  const [sessions, setSessions] = useState<BotProxySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('bot_proxy_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setConfig(data);
    } catch (error) {
      console.error('Error fetching bot proxy config:', error);
    }
  }, [user?.id]);

  const fetchSessions = useCallback(async () => {
    if (!user?.id || !config?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('bot_proxy_sessions')
        .select('*')
        .eq('config_id', config.id)
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching bot proxy sessions:', error);
    }
  }, [user?.id, config?.id]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchConfig();
      setIsLoading(false);
    };
    load();
  }, [fetchConfig]);

  useEffect(() => {
    if (config?.id) {
      fetchSessions();
    }
  }, [config?.id, fetchSessions]);

  const saveConfig = async (data: {
    bot_phone: string;
    trigger_label_id: string | null;
    instance_id: string | null;
    is_active: boolean;
  }) => {
    if (!user?.id) return null;

    setIsSaving(true);
    try {
      // Format phone number
      const formattedPhone = data.bot_phone.replace(/\D/g, '');

      if (config?.id) {
        // Update existing config
        const { data: updated, error } = await supabase
          .from('bot_proxy_config')
          .update({
            bot_phone: formattedPhone,
            trigger_label_id: data.trigger_label_id,
            instance_id: data.instance_id,
            is_active: data.is_active,
          })
          .eq('id', config.id)
          .select()
          .single();

        if (error) throw error;
        setConfig(updated);
        toast.success('Configuração atualizada!');
        return updated;
      } else {
        // Create new config
        const { data: created, error } = await supabase
          .from('bot_proxy_config')
          .insert({
            user_id: user.id,
            bot_phone: formattedPhone,
            trigger_label_id: data.trigger_label_id,
            instance_id: data.instance_id,
            is_active: data.is_active,
          })
          .select()
          .single();

        if (error) throw error;
        setConfig(created);
        toast.success('Configuração criada!');
        return created;
      }
    } catch (error: any) {
      console.error('Error saving bot proxy config:', error);
      toast.error('Erro ao salvar configuração');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (active: boolean) => {
    if (!config?.id) return;

    try {
      const { error } = await supabase
        .from('bot_proxy_config')
        .update({ is_active: active })
        .eq('id', config.id);

      if (error) throw error;
      setConfig(prev => prev ? { ...prev, is_active: active } : null);
      toast.success(active ? 'Ponte ativada!' : 'Ponte desativada!');
    } catch (error) {
      console.error('Error toggling bot proxy:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('bot_proxy_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Sessão encerrada!');
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Erro ao encerrar sessão');
    }
  };

  const getActiveSessionsCount = () => sessions.length;

  return {
    config,
    sessions,
    isLoading,
    isSaving,
    saveConfig,
    toggleActive,
    endSession,
    getActiveSessionsCount,
    refetch: fetchConfig,
    refetchSessions: fetchSessions,
  };
}
