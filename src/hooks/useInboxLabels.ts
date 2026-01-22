import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface InboxLabel {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export function useInboxLabels() {
  const { user } = useAuth();
  const [labels, setLabels] = useState<InboxLabel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLabels = useCallback(async () => {
    if (!user) {
      setLabels([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inbox_labels')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setLabels((data as InboxLabel[]) || []);
    } catch (error) {
      console.error('Error fetching inbox labels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const createLabel = async (data: {
    name: string;
    description?: string;
    color: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    const { data: newLabel, error } = await supabase
      .from('inbox_labels')
      .insert({
        user_id: user.id,
        name: data.name,
        description: data.description || null,
        color: data.color,
      })
      .select()
      .single();

    if (error) throw error;
    
    setLabels(prev => [...prev, newLabel as InboxLabel].sort((a, b) => 
      a.name.localeCompare(b.name)
    ));
    
    return newLabel;
  };

  const updateLabel = async (id: string, data: {
    name?: string;
    description?: string;
    color?: string;
  }) => {
    const { data: updated, error } = await supabase
      .from('inbox_labels')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    setLabels(prev => prev.map(l => l.id === id ? updated as InboxLabel : l));
    return updated;
  };

  const deleteLabel = async (id: string) => {
    const { error } = await supabase
      .from('inbox_labels')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setLabels(prev => prev.filter(l => l.id !== id));
  };

  return {
    labels,
    isLoading,
    createLabel,
    updateLabel,
    deleteLabel,
    refetch: fetchLabels,
  };
}
