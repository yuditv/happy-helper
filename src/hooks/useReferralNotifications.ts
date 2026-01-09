import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useReferralNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    const checkReferralNotifications = async () => {
      if (!user) return;

      // Check for unread referral completion notifications
      const { data: notifications } = await supabase
        .from('notification_history')
        .select('id, subject, created_at')
        .eq('user_id', user.id)
        .eq('notification_type', 'referral_completed')
        .eq('status', 'sent')
        .order('created_at', { ascending: false });

      if (notifications && notifications.length > 0) {
        // Show toast for each notification
        notifications.forEach((notification) => {
          toast.success(notification.subject, {
            duration: 8000,
            icon: '🎉',
          });
        });

        // Mark notifications as read
        const notificationIds = notifications.map(n => n.id);
        await supabase
          .from('notification_history')
          .update({ status: 'read' })
          .in('id', notificationIds);
      }
    };

    // Check after a small delay to avoid showing during initial load
    const timer = setTimeout(checkReferralNotifications, 1500);

    return () => clearTimeout(timer);
  }, [user]);
}
