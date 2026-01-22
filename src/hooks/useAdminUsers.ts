import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: {
    display_name: string | null;
    whatsapp: string | null;
    avatar_url: string | null;
  } | null;
  role: 'admin' | 'moderator' | 'user';
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  const checkAdminStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      const adminStatus = !!data;
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch {
      setIsAdmin(false);
      return false;
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: null,
      });

      // Handle the invocation differently - need to pass action as query param
      const response = await fetch(
        `https://tlanmmbgyyxuqvezudir.supabase.co/functions/v1/admin-users?action=list`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      setUsers(result.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao carregar usuários',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateUserRole = useCallback(async (userId: string, role: 'admin' | 'moderator' | 'user') => {
    try {
      const response = await fetch(
        `https://tlanmmbgyyxuqvezudir.supabase.co/functions/v1/admin-users?action=update-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ userId, role }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update role');
      }

      toast({
        title: 'Sucesso',
        description: 'Role do usuário atualizada',
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao atualizar role',
        variant: 'destructive',
      });
    }
  }, [fetchUsers, toast]);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      const response = await fetch(
        `https://tlanmmbgyyxuqvezudir.supabase.co/functions/v1/admin-users?action=delete-user`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário excluído',
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao excluir usuário',
        variant: 'destructive',
      });
    }
  }, [fetchUsers, toast]);

  return {
    users,
    isLoading,
    isAdmin,
    checkAdminStatus,
    fetchUsers,
    updateUserRole,
    deleteUser,
  };
}