import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface NotificationSettings {
  id?: string;
  user_id?: string;
  email_reminders_enabled: boolean;
  whatsapp_reminders_enabled: boolean;
  auto_send_enabled: boolean;
  reminder_days: number[];
  created_at?: string;
  updated_at?: string;
}

const defaultSettings: NotificationSettings = {
  email_reminders_enabled: true,
  whatsapp_reminders_enabled: false,
  auto_send_enabled: false,
  reminder_days: [7, 3, 1],
};

// Helper to make direct REST API calls to Supabase
async function supabaseRestCall(
  table: string,
  method: 'GET' | 'POST' | 'PATCH',
  query?: string,
  body?: any
) {
  const supabaseUrl = (supabase as any).supabaseUrl;
  const supabaseKey = (supabase as any).supabaseKey;
  
  const url = `${supabaseUrl}/rest/v1/${table}${query ? `?${query}` : ''}`;
  
  const headers: Record<string, string> = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation,resolution=merge-duplicates' : 'return=representation',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export function useNotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await supabaseRestCall(
        'notification_settings',
        'GET',
        `user_id=eq.${user.id}&select=*`
      );

      if (data && Array.isArray(data) && data.length > 0) {
        const dbSettings = data[0];
        setSettings({
          id: dbSettings.id,
          user_id: dbSettings.user_id,
          email_reminders_enabled: dbSettings.email_reminders_enabled ?? true,
          whatsapp_reminders_enabled: dbSettings.whatsapp_reminders_enabled ?? false,
          auto_send_enabled: dbSettings.auto_send_enabled ?? false,
          reminder_days: dbSettings.reminder_days ?? [7, 3, 1],
          created_at: dbSettings.created_at,
          updated_at: dbSettings.updated_at,
        });
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      // Table might not exist yet, use defaults
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user) {
      toast.error('Você precisa estar logado para salvar configurações');
      return false;
    }

    setIsSaving(true);
    try {
      const settingsToSave = {
        user_id: user.id,
        email_reminders_enabled: newSettings.email_reminders_enabled ?? settings.email_reminders_enabled,
        whatsapp_reminders_enabled: newSettings.whatsapp_reminders_enabled ?? settings.whatsapp_reminders_enabled,
        auto_send_enabled: newSettings.auto_send_enabled ?? settings.auto_send_enabled,
        reminder_days: newSettings.reminder_days ?? settings.reminder_days,
        updated_at: new Date().toISOString(),
      };

      // Upsert using POST with on_conflict
      await supabaseRestCall(
        'notification_settings',
        'POST',
        'on_conflict=user_id',
        settingsToSave
      );

      // Update local state
      setSettings({
        ...settings,
        ...newSettings,
      });
      
      toast.success('Configurações salvas com sucesso!');
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Erro ao salvar configurações. A tabela pode não existir ainda.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = async <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    return saveSettings({ [key]: value });
  };

  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
    updateSetting,
    refetch: fetchSettings,
  };
}
