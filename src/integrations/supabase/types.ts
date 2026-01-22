export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_at: string
          blocked_by: string
          created_at: string
          id: string
          reason: string | null
          unblocked_at: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string
          blocked_by: string
          created_at?: string
          id?: string
          reason?: string | null
          unblocked_at?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string
          created_at?: string
          id?: string
          reason?: string | null
          unblocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bulk_dispatch_history: {
        Row: {
          completed_at: string | null
          config_id: string | null
          created_at: string | null
          dispatch_type: string
          failed_count: number | null
          id: string
          message_content: string | null
          started_at: string | null
          status: string | null
          success_count: number | null
          target_type: string
          total_recipients: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          config_id?: string | null
          created_at?: string | null
          dispatch_type?: string
          failed_count?: number | null
          id?: string
          message_content?: string | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          target_type?: string
          total_recipients?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          config_id?: string | null
          created_at?: string | null
          dispatch_type?: string
          failed_count?: number | null
          id?: string
          message_content?: string | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          target_type?: string
          total_recipients?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_dispatch_history_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "dispatch_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          created_at: string | null
          error_message: string | null
          id: string
          name: string | null
          phone: string
          sent_at: string | null
          status: string
          variables: Json | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          name?: string | null
          phone: string
          sent_at?: string | null
          status?: string
          variables?: Json | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          name?: string | null
          phone?: string
          sent_at?: string | null
          status?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_logs: {
        Row: {
          campaign_id: string
          contact_id: string | null
          created_at: string | null
          event_type: string
          id: string
          message: string | null
          metadata: Json | null
        }
        Insert: {
          campaign_id: string
          contact_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
        }
        Update: {
          campaign_id?: string
          contact_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "campaign_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          failed_count: number | null
          id: string
          instance_id: string
          max_delay_seconds: number | null
          message_template: string
          min_delay_seconds: number | null
          name: string
          pause_after_messages: number | null
          pause_duration_seconds: number | null
          progress: number | null
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          total_contacts: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          failed_count?: number | null
          id?: string
          instance_id: string
          max_delay_seconds?: number | null
          message_template: string
          min_delay_seconds?: number | null
          name: string
          pause_after_messages?: number | null
          pause_duration_seconds?: number | null
          progress?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          total_contacts?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          failed_count?: number | null
          id?: string
          instance_id?: string
          max_delay_seconds?: number | null
          message_template?: string
          min_delay_seconds?: number | null
          name?: string
          pause_after_messages?: number | null
          pause_duration_seconds?: number | null
          progress?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          total_contacts?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tag_assignments: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          tag_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          tag_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tag_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "client_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          app_name: string | null
          created_at: string | null
          device: string | null
          email: string
          expires_at: string
          id: string
          name: string
          notes: string | null
          plan: string
          price: number | null
          service: string | null
          service_password: string | null
          service_username: string | null
          updated_at: string | null
          user_id: string
          whatsapp: string
        }
        Insert: {
          app_name?: string | null
          created_at?: string | null
          device?: string | null
          email: string
          expires_at: string
          id?: string
          name: string
          notes?: string | null
          plan: string
          price?: number | null
          service?: string | null
          service_password?: string | null
          service_username?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp: string
        }
        Update: {
          app_name?: string | null
          created_at?: string | null
          device?: string | null
          email?: string
          expires_at?: string
          id?: string
          name?: string
          notes?: string | null
          plan?: string
          price?: number | null
          service?: string | null
          service_password?: string | null
          service_username?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dispatch_configs: {
        Row: {
          ai_personalization: boolean | null
          allowed_days: number[] | null
          attention_call: boolean | null
          auto_archive: boolean | null
          balancing_mode: string | null
          business_hours_enabled: boolean | null
          business_hours_end: string | null
          business_hours_start: string | null
          created_at: string | null
          id: string
          instance_ids: string[]
          max_delay_seconds: number | null
          messages: Json
          min_delay_seconds: number | null
          name: string
          pause_after_messages: number | null
          pause_duration_minutes: number | null
          randomize_order: boolean | null
          smart_delay: boolean | null
          stop_after_messages: number | null
          updated_at: string | null
          user_id: string
          verify_numbers: boolean | null
        }
        Insert: {
          ai_personalization?: boolean | null
          allowed_days?: number[] | null
          attention_call?: boolean | null
          auto_archive?: boolean | null
          balancing_mode?: string | null
          business_hours_enabled?: boolean | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          created_at?: string | null
          id?: string
          instance_ids?: string[]
          max_delay_seconds?: number | null
          messages?: Json
          min_delay_seconds?: number | null
          name: string
          pause_after_messages?: number | null
          pause_duration_minutes?: number | null
          randomize_order?: boolean | null
          smart_delay?: boolean | null
          stop_after_messages?: number | null
          updated_at?: string | null
          user_id: string
          verify_numbers?: boolean | null
        }
        Update: {
          ai_personalization?: boolean | null
          allowed_days?: number[] | null
          attention_call?: boolean | null
          auto_archive?: boolean | null
          balancing_mode?: string | null
          business_hours_enabled?: boolean | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          created_at?: string | null
          id?: string
          instance_ids?: string[]
          max_delay_seconds?: number | null
          messages?: Json
          min_delay_seconds?: number | null
          name?: string
          pause_after_messages?: number | null
          pause_duration_minutes?: number | null
          randomize_order?: boolean | null
          smart_delay?: boolean | null
          stop_after_messages?: number | null
          updated_at?: string | null
          user_id?: string
          verify_numbers?: boolean | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          subject: string | null
          template_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          subject?: string | null
          template_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          subject?: string | null
          template_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          client_id: string | null
          created_at: string | null
          days_until_expiration: number | null
          id: string
          notification_type: string
          status: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          days_until_expiration?: number | null
          id?: string
          notification_type: string
          status?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          days_until_expiration?: number | null
          id?: string
          notification_type?: string
          status?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          auto_send_enabled: boolean | null
          created_at: string | null
          email_reminders_enabled: boolean | null
          id: string
          reminder_days: number[] | null
          reminder_messages: Json | null
          updated_at: string | null
          user_id: string
          whatsapp_reminders_enabled: boolean | null
        }
        Insert: {
          auto_send_enabled?: boolean | null
          created_at?: string | null
          email_reminders_enabled?: boolean | null
          id?: string
          reminder_days?: number[] | null
          reminder_messages?: Json | null
          updated_at?: string | null
          user_id: string
          whatsapp_reminders_enabled?: boolean | null
        }
        Update: {
          auto_send_enabled?: boolean | null
          created_at?: string | null
          email_reminders_enabled?: boolean | null
          id?: string
          reminder_days?: number[] | null
          reminder_messages?: Json | null
          updated_at?: string | null
          user_id?: string
          whatsapp_reminders_enabled?: boolean | null
        }
        Relationships: []
      }
      plan_settings: {
        Row: {
          created_at: string | null
          id: string
          plan_key: string
          plan_name: string
          plan_price: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_key: string
          plan_name: string
          plan_price: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_key?: string
          plan_name?: string
          plan_price?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      renewal_history: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          new_expires_at: string
          plan: string
          previous_expires_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          new_expires_at: string
          plan: string
          previous_expires_at: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          new_expires_at?: string
          plan?: string
          previous_expires_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_goals: {
        Row: {
          client_goal: number | null
          created_at: string | null
          id: string
          period: string | null
          revenue_goal: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_goal?: number | null
          created_at?: string | null
          id?: string
          period?: string | null
          revenue_goal?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_goal?: number | null
          created_at?: string | null
          id?: string
          period?: string | null
          revenue_goal?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          message_content: string
          message_type: string
          scheduled_at: string
          status: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          message_content: string
          message_type: string
          scheduled_at: string
          status?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          message_content?: string
          message_type?: string
          scheduled_at?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_contacts: {
        Row: {
          created_at: string | null
          dispatch_history_id: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          original_contact_id: string | null
          phone: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dispatch_history_id?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          original_contact_id?: string | null
          phone: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dispatch_history_id?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          original_contact_id?: string | null
          phone?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_manage_campaigns: boolean | null
          can_manage_clients: boolean | null
          can_manage_contacts: boolean | null
          can_manage_warming: boolean | null
          can_manage_whatsapp: boolean | null
          can_send_dispatches: boolean | null
          can_view_ai_agent: boolean | null
          can_view_campaigns: boolean | null
          can_view_clients: boolean | null
          can_view_contacts: boolean | null
          can_view_dashboard: boolean | null
          can_view_dispatches: boolean | null
          can_view_reports: boolean | null
          can_view_reseller: boolean | null
          can_view_settings: boolean | null
          can_view_warming: boolean | null
          can_view_whatsapp: boolean | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_manage_campaigns?: boolean | null
          can_manage_clients?: boolean | null
          can_manage_contacts?: boolean | null
          can_manage_warming?: boolean | null
          can_manage_whatsapp?: boolean | null
          can_send_dispatches?: boolean | null
          can_view_ai_agent?: boolean | null
          can_view_campaigns?: boolean | null
          can_view_clients?: boolean | null
          can_view_contacts?: boolean | null
          can_view_dashboard?: boolean | null
          can_view_dispatches?: boolean | null
          can_view_reports?: boolean | null
          can_view_reseller?: boolean | null
          can_view_settings?: boolean | null
          can_view_warming?: boolean | null
          can_view_whatsapp?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_manage_campaigns?: boolean | null
          can_manage_clients?: boolean | null
          can_manage_contacts?: boolean | null
          can_manage_warming?: boolean | null
          can_manage_whatsapp?: boolean | null
          can_send_dispatches?: boolean | null
          can_view_ai_agent?: boolean | null
          can_view_campaigns?: boolean | null
          can_view_clients?: boolean | null
          can_view_contacts?: boolean | null
          can_view_dashboard?: boolean | null
          can_view_dispatches?: boolean | null
          can_view_reports?: boolean | null
          can_view_reseller?: boolean | null
          can_view_settings?: boolean | null
          can_view_warming?: boolean | null
          can_view_whatsapp?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          business_hours_end: string | null
          business_hours_start: string | null
          created_at: string
          daily_limit: number | null
          id: string
          instance_key: string | null
          instance_name: string
          last_connected_at: string | null
          phone_connected: string | null
          qr_code: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_hours_end?: string | null
          business_hours_start?: string | null
          created_at?: string
          daily_limit?: number | null
          id?: string
          instance_key?: string | null
          instance_name: string
          last_connected_at?: string | null
          phone_connected?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_hours_end?: string | null
          business_hours_start?: string | null
          created_at?: string
          daily_limit?: number | null
          id?: string
          instance_key?: string | null
          instance_name?: string
          last_connected_at?: string | null
          phone_connected?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_blocked: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
