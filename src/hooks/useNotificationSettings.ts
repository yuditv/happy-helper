import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotificationSettings {
  email_reminders_enabled: boolean;
  whatsapp_reminders_enabled: boolean;
  auto_send_enabled: boolean;
  reminder_days: number[];
}

const defaultSettings: NotificationSettings = {
  email_reminders_enabled: true,
  whatsapp_reminders_enabled: false,
  auto_send_enabled: false,
  reminder_days: [7, 3, 1],
};

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
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading notification settings:', error);
        setSettings(defaultSettings);
      } else if (data) {
        setSettings({
          email_reminders_enabled: data.email_reminders_enabled ?? defaultSettings.email_reminders_enabled,
          whatsapp_reminders_enabled: data.whatsapp_reminders_enabled ?? defaultSettings.whatsapp_reminders_enabled,
          auto_send_enabled: data.auto_send_enabled ?? defaultSettings.auto_send_enabled,
          reminder_days: data.reminder_days ?? defaultSettings.reminder_days,
        });
      } else {
        // No settings exist yet, create default
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
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
      toast.error('Usuário não autenticado');
      return false;
    }

    setIsSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        ...newSettings,
      };

      // Check if record exists
      const { data: existing } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('notification_settings')
          .update({
            email_reminders_enabled: updatedSettings.email_reminders_enabled,
            whatsapp_reminders_enabled: updatedSettings.whatsapp_reminders_enabled,
            auto_send_enabled: updatedSettings.auto_send_enabled,
            reminder_days: updatedSettings.reminder_days,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        error = updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
            email_reminders_enabled: updatedSettings.email_reminders_enabled,
            whatsapp_reminders_enabled: updatedSettings.whatsapp_reminders_enabled,
            auto_send_enabled: updatedSettings.auto_send_enabled,
            reminder_days: updatedSettings.reminder_days,
          });
        error = insertError;
      }

      if (error) {
        console.error('Error saving notification settings:', error);
        toast.error('Erro ao salvar configurações.');
        return false;
      }

      setSettings(updatedSettings);
      toast.success('Configurações salvas com sucesso!');
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Erro ao salvar configurações.');
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

  // Trigger the renewal reminder scheduler
  const triggerReminderCheck = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('renewal-reminder-scheduler');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error triggering reminder check:', error);
      return null;
    }
  };

  // Trigger the scheduled dispatcher
  const triggerDispatcher = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-dispatcher');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error triggering dispatcher:', error);
      return null;
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
    updateSetting,
    refetch: fetchSettings,
    triggerReminderCheck,
    triggerDispatcher,
  };
}
