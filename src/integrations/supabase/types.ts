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
      cohort_college_signals: {
        Row: {
          accepted_count: number
          applied_count: number
          applying_count: number
          behavior_boost: number
          cohort_key: string
          cohort_size: number
          college_name: string
          computed_at: string
          id: string
          save_count: number
          total_dwell_ms: number
          view_count: number
        }
        Insert: {
          accepted_count?: number
          applied_count?: number
          applying_count?: number
          behavior_boost?: number
          cohort_key: string
          cohort_size?: number
          college_name: string
          computed_at?: string
          id?: string
          save_count?: number
          total_dwell_ms?: number
          view_count?: number
        }
        Update: {
          accepted_count?: number
          applied_count?: number
          applying_count?: number
          behavior_boost?: number
          cohort_key?: string
          cohort_size?: number
          college_name?: string
          computed_at?: string
          id?: string
          save_count?: number
          total_dwell_ms?: number
          view_count?: number
        }
        Relationships: []
      }
      college_lists: {
        Row: {
          category: string
          colleges: Json
          created_at: string
          description: string
          display_order: number
          emoji: string
          id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          colleges?: Json
          created_at?: string
          description?: string
          display_order?: number
          emoji?: string
          id?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          colleges?: Json
          created_at?: string
          description?: string
          display_order?: number
          emoji?: string
          id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      college_matches: {
        Row: {
          ai_error: string | null
          ai_status: string
          college_data: Json
          comparison_insight: string | null
          created_at: string
          id: string
          raw_preferences: Json
          results_generated_at: string | null
          results_version: number
          student_profile: Json
          user_id: string
        }
        Insert: {
          ai_error?: string | null
          ai_status?: string
          college_data?: Json
          comparison_insight?: string | null
          created_at?: string
          id?: string
          raw_preferences?: Json
          results_generated_at?: string | null
          results_version?: number
          student_profile?: Json
          user_id: string
        }
        Update: {
          ai_error?: string | null
          ai_status?: string
          college_data?: Json
          comparison_insight?: string | null
          created_at?: string
          id?: string
          raw_preferences?: Json
          results_generated_at?: string | null
          results_version?: number
          student_profile?: Json
          user_id?: string
        }
        Relationships: []
      }
      college_vibe_reviews: {
        Row: {
          college_name: string
          created_at: string
          id: string
          ratings: Json
          snippets: Json
          source_note: string
          sources: Json
          summary: string
          updated_at: string
        }
        Insert: {
          college_name: string
          created_at?: string
          id?: string
          ratings?: Json
          snippets?: Json
          source_note?: string
          sources?: Json
          summary?: string
          updated_at?: string
        }
        Update: {
          college_name?: string
          created_at?: string
          id?: string
          ratings?: Json
          snippets?: Json
          source_note?: string
          sources?: Json
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feedback_responses: {
        Row: {
          created_at: string
          id: string
          response_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          response_data?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          response_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          feedback_completed: boolean
          first_name: string | null
          home_address: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          feedback_completed?: boolean
          first_name?: string | null
          home_address?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          feedback_completed?: boolean
          first_name?: string | null
          home_address?: string | null
          id?: string
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          answers: Json
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          function_name: string
          id: string
          ip_address: string
          request_count: number
          window_start: string
        }
        Insert: {
          function_name: string
          id?: string
          ip_address: string
          request_count?: number
          window_start?: string
        }
        Update: {
          function_name?: string
          id?: string
          ip_address?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      saved_colleges: {
        Row: {
          college_data: Json
          college_name: string
          created_at: string
          id: string
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          college_data?: Json
          college_name: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          user_id: string
        }
        Update: {
          college_data?: Json
          college_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_scholarships: {
        Row: {
          amount: number
          created_at: string
          deadline: string
          id: string
          scholarship_id: string
          scholarship_name: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deadline: string
          id?: string
          scholarship_id: string
          scholarship_name: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deadline?: string
          id?: string
          scholarship_id?: string
          scholarship_name?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_scholarships_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarships: {
        Row: {
          amount: number
          application_url: string | null
          created_at: string
          deadline: string
          description: string
          eligibility_tags: string[]
          essay_required: boolean
          grade_levels: string[]
          id: string
          is_local: boolean
          majors: string[]
          merit_based: boolean
          min_gpa: number | null
          name: string
          need_based: boolean
          provider: string | null
          state: string | null
        }
        Insert: {
          amount?: number
          application_url?: string | null
          created_at?: string
          deadline: string
          description?: string
          eligibility_tags?: string[]
          essay_required?: boolean
          grade_levels?: string[]
          id?: string
          is_local?: boolean
          majors?: string[]
          merit_based?: boolean
          min_gpa?: number | null
          name: string
          need_based?: boolean
          provider?: string | null
          state?: string | null
        }
        Update: {
          amount?: number
          application_url?: string | null
          created_at?: string
          deadline?: string
          description?: string
          eligibility_tags?: string[]
          essay_required?: boolean
          grade_levels?: string[]
          id?: string
          is_local?: boolean
          majors?: string[]
          merit_based?: boolean
          min_gpa?: number | null
          name?: string
          need_based?: boolean
          provider?: string | null
          state?: string | null
        }
        Relationships: []
      }
      scoring_weight_adjustments: {
        Row: {
          academic_adj: number
          admission_adj: number
          computed_from: Json
          cost_adj: number
          created_at: string
          culture_adj: number
          distance_adj: number
          id: string
          size_adj: number
          support_adj: number
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_adj?: number
          admission_adj?: number
          computed_from?: Json
          cost_adj?: number
          created_at?: string
          culture_adj?: number
          distance_adj?: number
          id?: string
          size_adj?: number
          support_adj?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_adj?: number
          admission_adj?: number
          computed_from?: Json
          cost_adj?: number
          created_at?: string
          culture_adj?: number
          distance_adj?: number
          id?: string
          size_adj?: number
          support_adj?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          current_period_end: string | null
          email: string
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed: boolean
          subscription_status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          email: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          email?: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      survey_submissions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          preferences: Json
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          preferences?: Json
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          preferences?: Json
        }
        Relationships: []
      }
      user_actions: {
        Row: {
          action_type: string
          college_name: string
          created_at: string
          dwell_ms: number | null
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          action_type: string
          college_name: string
          created_at?: string
          dwell_ms?: number | null
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          action_type?: string
          college_name?: string
          created_at?: string
          dwell_ms?: number | null
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist_emails: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_rate_limits: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
