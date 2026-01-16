import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
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

const STORAGE_KEY = 'notification_settings';

export function useNotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const getStorageKey = useCallback(() => {
    return user ? `${STORAGE_KEY}_${user.id}` : STORAGE_KEY;
  }, [user]);

  const fetchSettings = useCallback(() => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({
          email_reminders_enabled: parsed.email_reminders_enabled ?? defaultSettings.email_reminders_enabled,
          whatsapp_reminders_enabled: parsed.whatsapp_reminders_enabled ?? defaultSettings.whatsapp_reminders_enabled,
          auto_send_enabled: parsed.auto_send_enabled ?? defaultSettings.auto_send_enabled,
          reminder_days: parsed.reminder_days ?? defaultSettings.reminder_days,
        });
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [getStorageKey]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (newSettings: Partial<NotificationSettings>) => {
    setIsSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        ...newSettings,
      };
      
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedSettings));
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

  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
    updateSetting,
    refetch: fetchSettings,
  };
}
