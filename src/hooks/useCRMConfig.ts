import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CRMFieldConfig {
  id?: string;
  fieldKey: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'date' | 'select';
  fieldOptions?: string[];
  isActive: boolean;
  displayOrder: number;
}

export function useCRMConfig(instanceId: string | null) {
  const [fieldConfigs, setFieldConfigs] = useState<CRMFieldConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchConfigs = useCallback(async () => {
    if (!instanceId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-uazapi', {
        body: {
          action: 'get_field_configs',
          instanceId,
        },
      });

      if (error) throw error;

      if (data?.data) {
        setFieldConfigs(data.data.map((config: any) => ({
          id: config.id,
          fieldKey: config.field_key,
          fieldName: config.field_name,
          fieldType: config.field_type,
          fieldOptions: config.field_options,
          isActive: config.is_active,
          displayOrder: config.display_order,
        })));
      }
    } catch (error) {
      console.error('Error fetching CRM configs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [instanceId]);

  const saveConfigs = useCallback(async (configs: CRMFieldConfig[]) => {
    if (!instanceId) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-uazapi', {
        body: {
          action: 'update_fields_map',
          instanceId,
          fieldConfigs: configs,
        },
      });

      if (error) throw error;

      toast.success('Configurações de campos salvas');
      await fetchConfigs();
    } catch (error) {
      console.error('Error saving CRM configs:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  }, [instanceId, fetchConfigs]);

  const fetchUazapiFieldsMap = useCallback(async () => {
    if (!instanceId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('crm-uazapi', {
        body: {
          action: 'get_fields_map',
          instanceId,
        },
      });

      if (error) throw error;
      return data?.data;
    } catch (error) {
      console.error('Error fetching UAZAPI fields map:', error);
      return null;
    }
  }, [instanceId]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // Generate default fields
  const getDefaultFields = (): CRMFieldConfig[] => {
    const fields: CRMFieldConfig[] = [];
    for (let i = 1; i <= 20; i++) {
      fields.push({
        fieldKey: `lead_field${i.toString().padStart(2, '0')}`,
        fieldName: `Campo ${i}`,
        fieldType: 'text',
        fieldOptions: [],
        isActive: false,
        displayOrder: i,
      });
    }
    return fields;
  };

  return {
    fieldConfigs,
    isLoading,
    isSaving,
    saveConfigs,
    fetchUazapiFieldsMap,
    getDefaultFields,
    refetch: fetchConfigs,
  };
}