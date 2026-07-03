export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_analysis: {
        Row: {
          cost_estimate: number | null
          created_at: string
          id: string
          model_name: string
          prompt_id: string | null
          provider_name: string
          response_text: string
          tokens_used: number | null
          trade_id: string
          trade_snapshot_at_analysis: Json
          user_id: string
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          id?: string
          model_name: string
          prompt_id?: string | null
          provider_name: string
          response_text: string
          tokens_used?: number | null
          trade_id: string
          trade_snapshot_at_analysis: Json
          user_id: string
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          id?: string
          model_name?: string
          prompt_id?: string | null
          provider_name?: string
          response_text?: string
          tokens_used?: number | null
          trade_id?: string
          trade_snapshot_at_analysis?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_config: {
        Row: {
          cost_per_1k_tokens: number | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          max_tokens: number
          model_name: string
          provider_name: string
          provider_secret_id: string | null
          updated_at: string
        }
        Insert: {
          cost_per_1k_tokens?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_tokens?: number
          model_name: string
          provider_name: string
          provider_secret_id?: string | null
          updated_at?: string
        }
        Update: {
          cost_per_1k_tokens?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_tokens?: number
          model_name?: string
          provider_name?: string
          provider_secret_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_daily: {
        Row: {
          requests_count: number
          source: string
          tokens_used: number
          usage_date: string
          user_id: string
        }
        Insert: {
          requests_count?: number
          source: string
          tokens_used?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          requests_count?: number
          source?: string
          tokens_used?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          contract_size: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          id: string
          is_custom: boolean
          market: Database["public"]["Enums"]["instrument_market"]
          name: string | null
          pip_value: number | null
          symbol: string
          tick_size: number | null
        }
        Insert: {
          contract_size?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          id?: string
          is_custom?: boolean
          market: Database["public"]["Enums"]["instrument_market"]
          name?: string | null
          pip_value?: number | null
          symbol: string
          tick_size?: number | null
        }
        Update: {
          contract_size?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          id?: string
          is_custom?: boolean
          market?: Database["public"]["Enums"]["instrument_market"]
          name?: string | null
          pip_value?: number | null
          symbol?: string
          tick_size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instruments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          achieved: boolean
          created_at: string
          current_value: number | null
          deleted_at: string | null
          id: string
          metric_type: string
          period_end: string | null
          period_start: string | null
          target_value: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved?: boolean
          created_at?: string
          current_value?: number | null
          deleted_at?: string | null
          id?: string
          metric_type: string
          period_end?: string | null
          period_start?: string | null
          target_value: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved?: boolean
          created_at?: string
          current_value?: number | null
          deleted_at?: string | null
          id?: string
          metric_type?: string
          period_end?: string | null
          period_start?: string | null
          target_value?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objectives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          acquisition_source: string | null
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          id: string
          onboarding_done: boolean
          onboarding_goals: string[] | null
          primary_broker: string | null
          role: Database["public"]["Enums"]["user_role"]
          timezone: string
          traded_instruments: string[] | null
          trading_experience: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          acquisition_source?: string | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          id: string
          onboarding_done?: boolean
          onboarding_goals?: string[] | null
          primary_broker?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string
          traded_instruments?: string[] | null
          trading_experience?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          acquisition_source?: string | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          id?: string
          onboarding_done?: boolean
          onboarding_goals?: string[] | null
          primary_broker?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string
          traded_instruments?: string[] | null
          trading_experience?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      strategies: {
        Row: {
          created_at: string
          criteria: Json | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criteria?: Json | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          criteria?: Json | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          trade_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          trade_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_history_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_images: {
        Row: {
          created_at: string
          id: string
          stage: Database["public"]["Enums"]["trade_image_stage"]
          storage_path: string
          trade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stage: Database["public"]["Enums"]["trade_image_stage"]
          storage_path: string
          trade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stage?: Database["public"]["Enums"]["trade_image_stage"]
          storage_path?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_images_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_threads: {
        Row: {
          ai_generated: boolean
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_id: string | null
          trade_id: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          trade_id: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_threads_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "trade_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_threads_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trader_rules: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trader_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          commission: number | null
          confidence_level: number | null
          confirmations: string | null
          context_after: string | null
          context_before: string | null
          context_during: string | null
          created_at: string
          deleted_at: string | null
          duration_minutes: number | null
          emotion: string | null
          entry_price: number
          entry_reason: string | null
          exit_price: number | null
          followed_plan: boolean | null
          had_fomo: boolean | null
          id: string
          instrument_id: string
          lesson_learned: string | null
          main_mistake: string | null
          management_notes: string | null
          moved_stop_loss: boolean | null
          overtraded: boolean | null
          pnl_amount: number | null
          pnl_r: number | null
          position_size: number | null
          reflection: string | null
          revenge_trade: boolean | null
          risk_percent: number | null
          side: Database["public"]["Enums"]["trade_side"]
          status: Database["public"]["Enums"]["trade_status"]
          stop_loss: number | null
          strategy_id: string | null
          stress_level: number | null
          take_profit: number | null
          timeframe: string | null
          traded_at: string
          updated_at: string
          user_id: string
          what_to_avoid: string | null
          what_to_repeat: string | null
        }
        Insert: {
          commission?: number | null
          confidence_level?: number | null
          confirmations?: string | null
          context_after?: string | null
          context_before?: string | null
          context_during?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number | null
          emotion?: string | null
          entry_price: number
          entry_reason?: string | null
          exit_price?: number | null
          followed_plan?: boolean | null
          had_fomo?: boolean | null
          id?: string
          instrument_id: string
          lesson_learned?: string | null
          main_mistake?: string | null
          management_notes?: string | null
          moved_stop_loss?: boolean | null
          overtraded?: boolean | null
          pnl_amount?: number | null
          pnl_r?: number | null
          position_size?: number | null
          reflection?: string | null
          revenge_trade?: boolean | null
          risk_percent?: number | null
          side: Database["public"]["Enums"]["trade_side"]
          status?: Database["public"]["Enums"]["trade_status"]
          stop_loss?: number | null
          strategy_id?: string | null
          stress_level?: number | null
          take_profit?: number | null
          timeframe?: string | null
          traded_at: string
          updated_at?: string
          user_id: string
          what_to_avoid?: string | null
          what_to_repeat?: string | null
        }
        Update: {
          commission?: number | null
          confidence_level?: number | null
          confirmations?: string | null
          context_after?: string | null
          context_before?: string | null
          context_during?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number | null
          emotion?: string | null
          entry_price?: number
          entry_reason?: string | null
          exit_price?: number | null
          followed_plan?: boolean | null
          had_fomo?: boolean | null
          id?: string
          instrument_id?: string
          lesson_learned?: string | null
          main_mistake?: string | null
          management_notes?: string | null
          moved_stop_loss?: boolean | null
          overtraded?: boolean | null
          pnl_amount?: number | null
          pnl_r?: number | null
          position_size?: number | null
          reflection?: string | null
          revenge_trade?: boolean | null
          risk_percent?: number | null
          side?: Database["public"]["Enums"]["trade_side"]
          status?: Database["public"]["Enums"]["trade_status"]
          stop_loss?: number | null
          strategy_id?: string | null
          stress_level?: number | null
          take_profit?: number | null
          timeframe?: string | null
          traded_at?: string
          updated_at?: string
          user_id?: string
          what_to_avoid?: string | null
          what_to_repeat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_settings: {
        Row: {
          byok_provider: string | null
          byok_secret_id: string | null
          updated_at: string
          use_own_key: boolean
          user_id: string
        }
        Insert: {
          byok_provider?: string | null
          byok_secret_id?: string | null
          updated_at?: string
          use_own_key?: boolean
          user_id: string
        }
        Update: {
          byok_provider?: string | null
          byok_secret_id?: string | null
          updated_at?: string
          use_own_key?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_rule_violations: {
        Row: {
          objective_count: number | null
          rule_flag: string | null
          self_reported_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_stats_by_emotion: {
        Row: {
          emotion: string | null
          trade_count: number | null
          user_id: string | null
          win_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_stats_by_strategy: {
        Row: {
          strategy_name: string | null
          trade_count: number | null
          user_id: string | null
          win_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_trade_stats: {
        Row: {
          avg_r: number | null
          closed_trades: number | null
          profit_factor: number | null
          total_trades: number | null
          user_id: string | null
          win_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_and_increment_ai_usage: {
        Args: {
          p_daily_limit: number
          p_source: string
          p_tokens: number
          p_user_id: string
        }
        Returns: {
          allowed: boolean
          requests_count: number
          tokens_used: number
        }[]
      }
      disable_byok: { Args: never; Returns: undefined }
      get_byok_status: {
        Args: never
        Returns: {
          byok_provider: string
          is_configured: boolean
          updated_at: string
          use_own_key: boolean
        }[]
      }
      is_superadmin: { Args: { uid: string }; Returns: boolean }
      read_vault_secret: { Args: { p_secret_id: string }; Returns: string }
      set_byok_api_key: {
        Args: { p_api_key: string; p_provider: string }
        Returns: undefined
      }
      set_provider_api_key: {
        Args: { p_api_key: string; p_provider_config_id: string }
        Returns: undefined
      }
    }
    Enums: {
      instrument_market:
        | "forex"
        | "crypto"
        | "stock"
        | "index"
        | "futures"
        | "options"
        | "cfd"
      trade_image_stage: "before" | "during" | "after"
      trade_side: "long" | "short"
      trade_status: "open" | "closed"
      user_role: "trader" | "superadmin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      instrument_market: [
        "forex",
        "crypto",
        "stock",
        "index",
        "futures",
        "options",
        "cfd",
      ],
      trade_image_stage: ["before", "during", "after"],
      trade_side: ["long", "short"],
      trade_status: ["open", "closed"],
      user_role: ["trader", "superadmin"],
    },
  },
} as const

