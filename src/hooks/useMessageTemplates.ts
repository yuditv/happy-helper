import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface MessageTemplate {
  id?: string;
  templateType: string;
  subject?: string;
  content: string;
}

interface DbTemplate {
  id: string;
  user_id: string;
  template_type: string;
  subject: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

const defaultTemplates: Record<string, { subject?: string; content: string }> = {
  whatsapp_reminder: {
    content: 'Olá {nome}! 👋\n\nSeu plano {plano} vence em {dias} dia(s), no dia {data_vencimento}.\n\nRenove agora para continuar aproveitando nossos serviços! 🚀'
  },
  email_reminder: {
    subject: 'Lembrete: Seu plano vence em {dias} dia(s)',
    content: 'Olá {nome},\n\nEste é um lembrete de que seu plano {plano} vence em {dias} dia(s), no dia {data_vencimento}.\n\nEntre em contato para renovar e continuar aproveitando nossos serviços.\n\nAtenciosamente,\nEquipe'
  },
  whatsapp_expiration: {
    content: 'Olá {nome}! ⚠️\n\nSeu plano {plano} venceu no dia {data_vencimento}.\n\nRenove agora para não perder o acesso aos nossos serviços!'
  },
  email_expiration: {
    subject: 'Aviso: Seu plano expirou',
    content: 'Olá {nome},\n\nSeu plano {plano} expirou no dia {data_vencimento}.\n\nEntre em contato para renovar e restaurar seu acesso.\n\nAtenciosamente,\nEquipe'
  }
};

export const templateLabels: Record<string, string> = {
  whatsapp_reminder: 'WhatsApp - Lembrete de Vencimento',
  email_reminder: 'Email - Lembrete de Vencimento',
  whatsapp_expiration: 'WhatsApp - Plano Expirado',
  email_expiration: 'Email - Plano Expirado'
};

export const templateVariables = [
  { key: '{nome}', description: 'Nome do cliente' },
  { key: '{plano}', description: 'Nome do plano' },
  { key: '{dias}', description: 'Dias até o vencimento' },
  { key: '{data_vencimento}', description: 'Data de vencimento' },
  { key: '{valor}', description: 'Valor do plano' }
];

export function useMessageTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Merge with defaults
      const allTemplates = Object.keys(defaultTemplates).map(type => {
        const existing = (data as DbTemplate[] | null)?.find(t => t.template_type === type);
        if (existing) {
          return {
            id: existing.id,
            templateType: existing.template_type,
            subject: existing.subject || undefined,
            content: existing.content
          };
        }
        return {
          templateType: type,
          subject: defaultTemplates[type].subject,
          content: defaultTemplates[type].content
        };
      });

      setTemplates(allTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const saveTemplate = async (template: MessageTemplate): Promise<boolean> => {
    if (!user) return false;

    try {
      if (template.id) {
        // Update existing
        const { error } = await supabase
          .from('message_templates')
          .update({
            subject: template.subject || null,
            content: template.content
          })
          .eq('id', template.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('message_templates')
          .insert({
            user_id: user.id,
            template_type: template.templateType,
            subject: template.subject || null,
            content: template.content
          });

        if (error) throw error;
      }

      toast.success('Template salvo com sucesso!');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Erro ao salvar template: ' + error.message);
      return false;
    }
  };

  const resetTemplate = async (templateType: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('user_id', user.id)
        .eq('template_type', templateType);

      if (error) throw error;

      toast.success('Template restaurado para o padrão!');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Error resetting template:', error);
      toast.error('Erro ao restaurar template: ' + error.message);
      return false;
    }
  };

  const getTemplate = (templateType: string): MessageTemplate | undefined => {
    return templates.find(t => t.templateType === templateType);
  };

  return {
    templates,
    isLoading,
    saveTemplate,
    resetTemplate,
    getTemplate,
    refetch: fetchTemplates
  };
}
