import { supabase } from "@/lib/supabaseClient";

export type Notification = {
  id: string;
  user_id: string;
  type: 'deal_status' | 'order_status' | 'announcement';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
};

export const NotificationService = {
  /**
   * Get all notifications for the current user
   */
  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[NotificationService] Error fetching notifications:", error);
      return [];
    }
    return data as Notification[];
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error("[NotificationService] Error marking as read:", error);
    }
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("[NotificationService] Error marking all as read:", error);
    }
  },

  /**
   * Create a new notification (Internal/System use)
   */
  async createNotification(payload: Omit<Notification, 'id' | 'created_at' | 'is_read'>) {
    const { error } = await supabase
      .from("notifications")
      .insert([payload]);

    if (error) {
      console.error("[NotificationService] Error creating notification:", error);
    }
  },

  /**
   * Subscribe to real-time notification updates
   */
  subscribe(userId: string, onUpdate: (payload: any) => void) {
    return supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        onUpdate
      )
      .subscribe();
  }
};
