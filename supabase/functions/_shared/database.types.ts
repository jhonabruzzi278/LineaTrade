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
    PostgrestVersion: "14.5"
  }
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
      academy_lesson_progress: {
        Row: {
          completed_at: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ai_coach_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_coach_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          facts_cited: Json | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          facts_cited?: Json | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          facts_cited?: Json | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_coach_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          context_snapshot: Json
          created_at: string
          id: string
          insights: Json
          model_name: string
          provider_name: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          context_snapshot: Json
          created_at?: string
          id?: string
          insights: Json
          model_name: string
          provider_name: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          context_snapshot?: Json
          created_at?: string
          id?: string
          insights?: Json
          model_name?: string
          provider_name?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_user_id_fkey"
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
      ai_rate_limit_config: {
        Row: {
          free_tier_daily_limit: number
          id: number
          updated_at: string
        }
        Insert: {
          free_tier_daily_limit?: number
          id?: number
          updated_at?: string
        }
        Update: {
          free_tier_daily_limit?: number
          id?: number
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
      backtest_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          initial_balance: number
          provider: string
          replay_from: string
          replay_to: string
          started_at: string
          symbol: string
          timeframe: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          initial_balance?: number
          provider?: string
          replay_from: string
          replay_to: string
          started_at?: string
          symbol: string
          timeframe: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          initial_balance?: number
          provider?: string
          replay_from?: string
          replay_to?: string
          started_at?: string
          symbol?: string
          timeframe?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backtest_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_checkout_sessions: {
        Row: {
          created_at: string
          error_code: string | null
          expires_at: string
          flow_customer_id: string
          flow_plan_id: string
          id: string
          registration_token: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          expires_at?: string
          flow_customer_id: string
          flow_plan_id: string
          id?: string
          registration_token: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          expires_at?: string
          flow_customer_id?: string
          flow_plan_id?: string
          id?: string
          registration_token?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_checkout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_customers: {
        Row: {
          created_at: string
          provider: string
          provider_customer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider?: string
          provider_customer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider?: string
          provider_customer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          payload: Json
          processed_at: string
          provider: string
        }
        Insert: {
          event_id: string
          event_type: string
          payload?: Json
          processed_at?: string
          provider?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          payload?: Json
          processed_at?: string
          provider?: string
        }
        Relationships: []
      }
      chart_annotations: {
        Row: {
          backtest_session_id: string | null
          confluence_type_id: string
          created_at: string
          id: string
          price_end: number | null
          price_start: number
          source: string
          symbol: string
          time_end: number | null
          time_start: number
          timeframe: string
          trade_id: string | null
          user_id: string
        }
        Insert: {
          backtest_session_id?: string | null
          confluence_type_id: string
          created_at?: string
          id?: string
          price_end?: number | null
          price_start: number
          source?: string
          symbol: string
          time_end?: number | null
          time_start: number
          timeframe: string
          trade_id?: string | null
          user_id: string
        }
        Update: {
          backtest_session_id?: string | null
          confluence_type_id?: string
          created_at?: string
          id?: string
          price_end?: number | null
          price_start?: number
          source?: string
          symbol?: string
          time_end?: number | null
          time_start?: number
          timeframe?: string
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_annotations_backtest_session_id_fkey"
            columns: ["backtest_session_id"]
            isOneToOne: false
            referencedRelation: "backtest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_annotations_confluence_type_id_fkey"
            columns: ["confluence_type_id"]
            isOneToOne: false
            referencedRelation: "confluence_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_annotations_confluence_type_id_fkey"
            columns: ["confluence_type_id"]
            isOneToOne: false
            referencedRelation: "v_user_stats_by_confluence_single"
            referencedColumns: ["confluence_type_id"]
          },
          {
            foreignKeyName: "chart_annotations_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_annotations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      confluence_types: {
        Row: {
          color: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          shape: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          shape: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          shape?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "confluence_types_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_challenge_phases: {
        Row: {
          account_identifier: string | null
          challenge_id: string
          completed_on: string | null
          completion_note: string | null
          created_at: string
          id: string
          phase_kind: Database["public"]["Enums"]["funding_phase_kind"]
          phase_number: number
          start_balance: number
          started_on: string
          status: Database["public"]["Enums"]["funding_phase_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_identifier?: string | null
          challenge_id: string
          completed_on?: string | null
          completion_note?: string | null
          created_at?: string
          id?: string
          phase_kind?: Database["public"]["Enums"]["funding_phase_kind"]
          phase_number: number
          start_balance: number
          started_on: string
          status?: Database["public"]["Enums"]["funding_phase_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_identifier?: string | null
          challenge_id?: string
          completed_on?: string | null
          completion_note?: string | null
          created_at?: string
          id?: string
          phase_kind?: Database["public"]["Enums"]["funding_phase_kind"]
          phase_number?: number
          start_balance?: number
          started_on?: string
          status?: Database["public"]["Enums"]["funding_phase_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_challenge_phases_owner_fkey"
            columns: ["challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "funding_challenges"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "funding_challenge_phases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_challenge_rules: {
        Row: {
          challenge_id: string
          created_at: string
          daily_drawdown_percent: number | null
          drawdown_type: Database["public"]["Enums"]["funding_drawdown_type"]
          id: string
          max_daily_consistency_percent: number | null
          max_drawdown_percent: number
          min_trading_days_per_phase: number
          phase_one_profit_target_percent: number
          phase_two_profit_target_percent: number | null
          phase_two_requires_new_account: boolean
          profit_split_percent: number | null
          rule_snapshot: Json
          rule_timezone: string
          source_template_version_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          daily_drawdown_percent?: number | null
          drawdown_type?: Database["public"]["Enums"]["funding_drawdown_type"]
          id?: string
          max_daily_consistency_percent?: number | null
          max_drawdown_percent: number
          min_trading_days_per_phase?: number
          phase_one_profit_target_percent: number
          phase_two_profit_target_percent?: number | null
          phase_two_requires_new_account?: boolean
          profit_split_percent?: number | null
          rule_snapshot?: Json
          rule_timezone?: string
          source_template_version_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          daily_drawdown_percent?: number | null
          drawdown_type?: Database["public"]["Enums"]["funding_drawdown_type"]
          id?: string
          max_daily_consistency_percent?: number | null
          max_drawdown_percent?: number
          min_trading_days_per_phase?: number
          phase_one_profit_target_percent?: number
          phase_two_profit_target_percent?: number | null
          phase_two_requires_new_account?: boolean
          profit_split_percent?: number | null
          rule_snapshot?: Json
          rule_timezone?: string
          source_template_version_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_challenge_rules_owner_fkey"
            columns: ["challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "funding_challenges"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "funding_challenge_rules_source_template_version_id_fkey"
            columns: ["source_template_version_id"]
            isOneToOne: false
            referencedRelation: "funding_rule_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_challenge_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_challenges: {
        Row: {
          account_identifier: string | null
          account_size: number
          account_type: Database["public"]["Enums"]["funding_account_type"]
          completed_at: string | null
          created_at: string
          currency_code: string
          deleted_at: string | null
          firm_name: string
          id: string
          notes: string | null
          prop_firm_id: string | null
          purchase_cost: number
          started_on: string
          status: Database["public"]["Enums"]["funding_challenge_status"]
          strategy_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_identifier?: string | null
          account_size: number
          account_type: Database["public"]["Enums"]["funding_account_type"]
          completed_at?: string | null
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          firm_name: string
          id?: string
          notes?: string | null
          prop_firm_id?: string | null
          purchase_cost?: number
          started_on: string
          status?: Database["public"]["Enums"]["funding_challenge_status"]
          strategy_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_identifier?: string | null
          account_size?: number
          account_type?: Database["public"]["Enums"]["funding_account_type"]
          completed_at?: string | null
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          firm_name?: string
          id?: string
          notes?: string | null
          prop_firm_id?: string | null
          purchase_cost?: number
          started_on?: string
          status?: Database["public"]["Enums"]["funding_challenge_status"]
          strategy_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_challenges_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_challenges_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["funding_expense_category"]
          challenge_id: string | null
          created_at: string
          description: string
          id: string
          incurred_on: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["funding_expense_category"]
          challenge_id?: string | null
          created_at?: string
          description: string
          id?: string
          incurred_on: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["funding_expense_category"]
          challenge_id?: string | null
          created_at?: string
          description?: string
          id?: string
          incurred_on?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_expenses_challenge_owner_fkey"
            columns: ["challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "funding_challenges"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "funding_expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_payouts: {
        Row: {
          challenge_id: string
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          paid_on: string | null
          phase_id: string | null
          reference: string | null
          requested_on: string
          status: Database["public"]["Enums"]["funding_payout_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          gross_amount: number
          id?: string
          net_amount: number
          notes?: string | null
          paid_on?: string | null
          phase_id?: string | null
          reference?: string | null
          requested_on: string
          status?: Database["public"]["Enums"]["funding_payout_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          paid_on?: string | null
          phase_id?: string | null
          reference?: string | null
          requested_on?: string
          status?: Database["public"]["Enums"]["funding_payout_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_payouts_challenge_owner_fkey"
            columns: ["challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "funding_challenges"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "funding_payouts_phase_owner_fkey"
            columns: ["phase_id", "challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "funding_challenge_phases"
            referencedColumns: ["id", "challenge_id", "user_id"]
          },
          {
            foreignKeyName: "funding_payouts_phase_owner_fkey"
            columns: ["phase_id", "challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "v_funding_phase_progress"
            referencedColumns: ["phase_id", "challenge_id", "user_id"]
          },
          {
            foreignKeyName: "funding_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_rule_template_versions: {
        Row: {
          created_at: string
          created_by: string | null
          daily_drawdown_percent: number | null
          drawdown_type: Database["public"]["Enums"]["funding_drawdown_type"]
          effective_from: string | null
          effective_to: string | null
          id: string
          max_daily_consistency_percent: number | null
          max_drawdown_percent: number
          min_trading_days_per_phase: number
          phase_one_profit_target_percent: number
          phase_two_profit_target_percent: number | null
          phase_two_requires_new_account: boolean
          profit_split_percent: number | null
          published_at: string
          rule_timezone: string
          source_note: string | null
          source_url: string | null
          template_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          daily_drawdown_percent?: number | null
          drawdown_type?: Database["public"]["Enums"]["funding_drawdown_type"]
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          max_daily_consistency_percent?: number | null
          max_drawdown_percent: number
          min_trading_days_per_phase?: number
          phase_one_profit_target_percent: number
          phase_two_profit_target_percent?: number | null
          phase_two_requires_new_account?: boolean
          profit_split_percent?: number | null
          published_at?: string
          rule_timezone?: string
          source_note?: string | null
          source_url?: string | null
          template_id: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          daily_drawdown_percent?: number | null
          drawdown_type?: Database["public"]["Enums"]["funding_drawdown_type"]
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          max_daily_consistency_percent?: number | null
          max_drawdown_percent?: number
          min_trading_days_per_phase?: number
          phase_one_profit_target_percent?: number
          phase_two_profit_target_percent?: number | null
          phase_two_requires_new_account?: boolean
          profit_split_percent?: number | null
          published_at?: string
          rule_timezone?: string
          source_note?: string | null
          source_url?: string | null
          template_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "funding_rule_template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_rule_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "funding_rule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_rule_templates: {
        Row: {
          account_type: Database["public"]["Enums"]["funding_account_type"]
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          prop_firm_id: string
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["funding_account_type"]
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          prop_firm_id: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["funding_account_type"]
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          prop_firm_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_rule_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_rule_templates_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
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
      news_article_body: {
        Row: {
          article_id: string
          body_text: string | null
          content_license: string
          fetched_at: string
          source_url: string
          word_count: number | null
        }
        Insert: {
          article_id: string
          body_text?: string | null
          content_license: string
          fetched_at?: string
          source_url: string
          word_count?: number | null
        }
        Update: {
          article_id?: string
          body_text?: string | null
          content_license?: string
          fetched_at?: string
          source_url?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "news_article_body_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "news_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          category: string
          created_at: string
          fetched_at: string
          id: string
          image_url: string | null
          published_at: string
          source_name: string
          summary: string | null
          title: string
          url: string
        }
        Insert: {
          category: string
          created_at?: string
          fetched_at?: string
          id?: string
          image_url?: string | null
          published_at: string
          source_name: string
          summary?: string | null
          title: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          fetched_at?: string
          id?: string
          image_url?: string | null
          published_at?: string
          source_name?: string
          summary?: string | null
          title?: string
          url?: string
        }
        Relationships: []
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
      plan_entitlements: {
        Row: {
          enabled: boolean
          feature_key: string
          hard_limit: number | null
          metadata: Json
          period: string | null
          plan_key: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          feature_key: string
          hard_limit?: number | null
          metadata?: Json
          period?: string | null
          plan_key: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          hard_limit?: number | null
          metadata?: Json
          period?: string | null
          plan_key?: string
          updated_at?: string
        }
        Relationships: []
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
      prop_firms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prop_firms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_key: string
          provider: string
          provider_price_id: string | null
          provider_product_id: string | null
          provider_subscription_id: string
          status: string
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_key: string
          provider?: string
          provider_price_id?: string | null
          provider_product_id?: string | null
          provider_subscription_id: string
          status: string
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_key?: string
          provider?: string
          provider_price_id?: string | null
          provider_product_id?: string | null
          provider_subscription_id?: string
          status?: string
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_confluences: {
        Row: {
          confluence_type_id: string
          created_at: string
          trade_id: string
          user_id: string
        }
        Insert: {
          confluence_type_id: string
          created_at?: string
          trade_id: string
          user_id: string
        }
        Update: {
          confluence_type_id?: string
          created_at?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_confluences_confluence_type_id_fkey"
            columns: ["confluence_type_id"]
            isOneToOne: false
            referencedRelation: "confluence_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_confluences_confluence_type_id_fkey"
            columns: ["confluence_type_id"]
            isOneToOne: false
            referencedRelation: "v_user_stats_by_confluence_single"
            referencedColumns: ["confluence_type_id"]
          },
          {
            foreignKeyName: "trade_confluences_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_confluences_user_id_fkey"
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
      trade_orders: {
        Row: {
          all_or_none: boolean
          ask_price: number | null
          bid_price: number | null
          created_at: string
          id: string
          leg: string
          limit_price: number | null
          order_number: string | null
          order_placed_at: string | null
          price_type: string | null
          term: string | null
          trade_id: string
          user_id: string
        }
        Insert: {
          all_or_none?: boolean
          ask_price?: number | null
          bid_price?: number | null
          created_at?: string
          id?: string
          leg: string
          limit_price?: number | null
          order_number?: string | null
          order_placed_at?: string | null
          price_type?: string | null
          term?: string | null
          trade_id: string
          user_id: string
        }
        Update: {
          all_or_none?: boolean
          ask_price?: number | null
          bid_price?: number | null
          created_at?: string
          id?: string
          leg?: string
          limit_price?: number | null
          order_number?: string | null
          order_placed_at?: string | null
          price_type?: string | null
          term?: string | null
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_orders_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "trade_threads_parent_trade_fkey"
            columns: ["parent_id", "trade_id"]
            isOneToOne: false
            referencedRelation: "trade_threads"
            referencedColumns: ["id", "trade_id"]
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
      trader_plans: {
        Row: {
          answers: Json
          created_at: string
          id: string
          plan: Json
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          plan: Json
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          plan?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trader_plans_user_id_fkey"
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
          anxiety_level: number | null
          backtest_session_id: string | null
          closed_early: boolean | null
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
          entered_impulsively: boolean | null
          entry_price: number
          entry_reason: string | null
          exit_price: number | null
          expiration_date: string | null
          fear_level: number | null
          followed_plan: boolean | null
          funding_challenge_id: string | null
          funding_phase_id: string | null
          had_distractions: boolean | null
          had_fomo: boolean | null
          hesitated: boolean | null
          id: string
          instrument_id: string
          is_backtest: boolean
          lesson_learned: string | null
          main_mistake: string | null
          management_notes: string | null
          moved_stop_loss: boolean | null
          moved_take_profit: boolean | null
          option_type: Database["public"]["Enums"]["option_type"] | null
          overconfidence: boolean | null
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
          strike_price: number | null
          take_profit: number | null
          timeframe: string | null
          traded_at: string
          updated_at: string
          user_id: string
          what_to_avoid: string | null
          what_to_repeat: string | null
        }
        Insert: {
          anxiety_level?: number | null
          backtest_session_id?: string | null
          closed_early?: boolean | null
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
          entered_impulsively?: boolean | null
          entry_price: number
          entry_reason?: string | null
          exit_price?: number | null
          expiration_date?: string | null
          fear_level?: number | null
          followed_plan?: boolean | null
          funding_challenge_id?: string | null
          funding_phase_id?: string | null
          had_distractions?: boolean | null
          had_fomo?: boolean | null
          hesitated?: boolean | null
          id?: string
          instrument_id: string
          is_backtest?: boolean
          lesson_learned?: string | null
          main_mistake?: string | null
          management_notes?: string | null
          moved_stop_loss?: boolean | null
          moved_take_profit?: boolean | null
          option_type?: Database["public"]["Enums"]["option_type"] | null
          overconfidence?: boolean | null
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
          strike_price?: number | null
          take_profit?: number | null
          timeframe?: string | null
          traded_at: string
          updated_at?: string
          user_id: string
          what_to_avoid?: string | null
          what_to_repeat?: string | null
        }
        Update: {
          anxiety_level?: number | null
          backtest_session_id?: string | null
          closed_early?: boolean | null
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
          entered_impulsively?: boolean | null
          entry_price?: number
          entry_reason?: string | null
          exit_price?: number | null
          expiration_date?: string | null
          fear_level?: number | null
          followed_plan?: boolean | null
          funding_challenge_id?: string | null
          funding_phase_id?: string | null
          had_distractions?: boolean | null
          had_fomo?: boolean | null
          hesitated?: boolean | null
          id?: string
          instrument_id?: string
          is_backtest?: boolean
          lesson_learned?: string | null
          main_mistake?: string | null
          management_notes?: string | null
          moved_stop_loss?: boolean | null
          moved_take_profit?: boolean | null
          option_type?: Database["public"]["Enums"]["option_type"] | null
          overconfidence?: boolean | null
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
          strike_price?: number | null
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
            foreignKeyName: "trades_backtest_session_id_fkey"
            columns: ["backtest_session_id"]
            isOneToOne: false
            referencedRelation: "backtest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_funding_challenge_owner_fkey"
            columns: ["funding_challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "funding_challenges"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "trades_funding_phase_owner_fkey"
            columns: ["funding_phase_id", "funding_challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "funding_challenge_phases"
            referencedColumns: ["id", "challenge_id", "user_id"]
          },
          {
            foreignKeyName: "trades_funding_phase_owner_fkey"
            columns: ["funding_phase_id", "funding_challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "v_funding_phase_progress"
            referencedColumns: ["phase_id", "challenge_id", "user_id"]
          },
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
          byok_model: string | null
          byok_provider: string | null
          byok_secret_id: string | null
          updated_at: string
          use_own_key: boolean
          user_id: string
        }
        Insert: {
          byok_model?: string | null
          byok_provider?: string | null
          byok_secret_id?: string | null
          updated_at?: string
          use_own_key?: boolean
          user_id: string
        }
        Update: {
          byok_model?: string | null
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
      user_entitlement_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean | null
          expires_at: string | null
          feature_key: string
          hard_limit: number | null
          id: string
          period: string | null
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean | null
          expires_at?: string | null
          feature_key: string
          hard_limit?: number | null
          id?: string
          period?: string | null
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean | null
          expires_at?: string | null
          feature_key?: string
          hard_limit?: number | null
          id?: string
          period?: string | null
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_entitlement_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_entitlement_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_funding_phase_progress: {
        Row: {
          best_day_profit_share_percent: number | null
          best_positive_daily_pnl: number | null
          challenge_id: string | null
          closed_trade_count: number | null
          consistency_breached: boolean | null
          daily_drawdown_breached: boolean | null
          daily_drawdown_limit_amount: number | null
          drawdown_type:
            | Database["public"]["Enums"]["funding_drawdown_type"]
            | null
          end_of_day_trailing_drawdown_amount: number | null
          max_drawdown_breached: boolean | null
          max_drawdown_limit_amount: number | null
          minimum_days_reached: boolean | null
          net_pnl: number | null
          pass_eligible_from_closed_trades: boolean | null
          phase_id: string | null
          phase_kind: Database["public"]["Enums"]["funding_phase_kind"] | null
          phase_number: number | null
          profit_target_amount: number | null
          profit_target_percent: number | null
          profit_target_reached: boolean | null
          realized_balance: number | null
          start_balance: number | null
          static_drawdown_amount: number | null
          stored_status:
            | Database["public"]["Enums"]["funding_phase_status"]
            | null
          trading_day_count: number | null
          trailing_drawdown_amount: number | null
          user_id: string | null
          worst_daily_pnl: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_challenge_phases_owner_fkey"
            columns: ["challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "funding_challenges"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "funding_challenge_phases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_funding_phase_trade_daily: {
        Row: {
          challenge_id: string | null
          closed_trade_count: number | null
          daily_pnl: number | null
          phase_id: string | null
          trading_day: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_funding_challenge_owner_fkey"
            columns: ["challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "funding_challenges"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "trades_funding_phase_owner_fkey"
            columns: ["phase_id", "challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "funding_challenge_phases"
            referencedColumns: ["id", "challenge_id", "user_id"]
          },
          {
            foreignKeyName: "trades_funding_phase_owner_fkey"
            columns: ["phase_id", "challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "v_funding_phase_progress"
            referencedColumns: ["phase_id", "challenge_id", "user_id"]
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
      v_user_psychology_stats: {
        Row: {
          pct_closed_early: number | null
          pct_disciplined: number | null
          pct_distractions: number | null
          pct_fomo: number | null
          pct_hesitated: number | null
          pct_impulsive: number | null
          pct_moved_stop: number | null
          pct_moved_tp: number | null
          pct_off_plan: number | null
          pct_overconfidence: number | null
          pct_overtraded: number | null
          pct_revenge: number | null
          total_trades: number | null
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
      v_user_psychology_tag_stats: {
        Row: {
          avg_r: number | null
          closed_trades: number | null
          profit_factor: number | null
          tag_name: string | null
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
      v_user_stats_by_confluence_combo: {
        Row: {
          avg_r: number | null
          confluence_names: string[] | null
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
      v_user_stats_by_confluence_single: {
        Row: {
          avg_r: number | null
          confluence_name: string | null
          confluence_type_id: string | null
          total_trades: number | null
          user_id: string | null
          win_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_confluences_user_id_fkey"
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
      v_user_stats_by_hour: {
        Row: {
          avg_r: number | null
          hour_of_day: number | null
          net_pnl: number | null
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
      v_user_stats_by_instrument: {
        Row: {
          avg_r: number | null
          net_pnl: number | null
          symbol: string | null
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
      v_user_stats_by_weekday: {
        Row: {
          avg_r: number | null
          net_pnl: number | null
          total_trades: number | null
          user_id: string | null
          weekday: number | null
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
          byok_model: string
          byok_provider: string
          is_configured: boolean
          updated_at: string
          use_own_key: boolean
        }[]
      }
      get_cron_job_health: {
        Args: never
        Returns: {
          active: boolean
          job_name: string
          last_run_at: string
          last_run_message: string
          last_run_status: string
          schedule: string
        }[]
      }
      get_cron_secrets_status: {
        Args: never
        Returns: {
          is_configured: boolean
          secret_name: string
        }[]
      }
      get_my_entitlements: {
        Args: never
        Returns: {
          enabled: boolean
          feature_key: string
          hard_limit: number
          period: string
          plan_key: string
        }[]
      }
      get_system_metrics: {
        Args: never
        Returns: {
          active_strategies: number
          active_trader_rules: number
          active_users_30d: number
          active_users_7d: number
          ai_analyses_7d: number
          ai_tokens_used_7d: number
          byok_users: number
          closed_trades: number
          default_ai_model: string
          default_ai_provider: string
          generated_at: string
          new_users_7d: number
          news_latest_fetched_at: string
          open_trades: number
          options_trades_total: number
          push_subscriptions_total: number
          total_ai_analyses: number
          total_news_articles: number
          total_objectives: number
          total_trades: number
          total_users: number
          trader_plans_total: number
          trader_plans_unique_users: number
          trades_7d: number
          users_hit_daily_limit_today: number
        }[]
      }
      invoke_news_cron_refresh: { Args: never; Returns: undefined }
      invoke_trade_reminder_cron: { Args: never; Returns: undefined }
      is_superadmin: { Args: { uid: string }; Returns: boolean }
      read_vault_secret: { Args: { p_secret_id: string }; Returns: string }
      set_ai_rate_limit: { Args: { p_daily_limit: number }; Returns: undefined }
      set_byok_api_key: {
        Args: { p_api_key: string; p_model: string; p_provider: string }
        Returns: undefined
      }
      set_provider_api_key: {
        Args: { p_api_key: string; p_provider_config_id: string }
        Returns: undefined
      }
      set_provider_model: {
        Args: {
          p_model_name: string
          p_provider_config_id: string
          p_provider_name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      funding_account_type:
        | "evaluation_two_phase"
        | "evaluation_one_phase"
        | "instant_funded"
      funding_challenge_status:
        | "phase_one"
        | "phase_two"
        | "funded"
        | "burned"
        | "expired"
        | "cancelled"
      funding_drawdown_type: "static" | "end_of_day" | "trailing"
      funding_expense_category:
        | "challenge_fee"
        | "reset_fee"
        | "platform"
        | "tool"
        | "course"
        | "other"
      funding_payout_status:
        | "requested"
        | "approved"
        | "paid"
        | "rejected"
        | "cancelled"
      funding_phase_kind: "evaluation" | "funded"
      funding_phase_status:
        | "active"
        | "passed"
        | "failed"
        | "expired"
        | "cancelled"
      instrument_market:
        | "forex"
        | "crypto"
        | "stock"
        | "index"
        | "futures"
        | "options"
        | "cfd"
      option_type: "call" | "put"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      funding_account_type: [
        "evaluation_two_phase",
        "evaluation_one_phase",
        "instant_funded",
      ],
      funding_challenge_status: [
        "phase_one",
        "phase_two",
        "funded",
        "burned",
        "expired",
        "cancelled",
      ],
      funding_drawdown_type: ["static", "end_of_day", "trailing"],
      funding_expense_category: [
        "challenge_fee",
        "reset_fee",
        "platform",
        "tool",
        "course",
        "other",
      ],
      funding_payout_status: [
        "requested",
        "approved",
        "paid",
        "rejected",
        "cancelled",
      ],
      funding_phase_kind: ["evaluation", "funded"],
      funding_phase_status: [
        "active",
        "passed",
        "failed",
        "expired",
        "cancelled",
      ],
      instrument_market: [
        "forex",
        "crypto",
        "stock",
        "index",
        "futures",
        "options",
        "cfd",
      ],
      option_type: ["call", "put"],
      trade_image_stage: ["before", "during", "after"],
      trade_side: ["long", "short"],
      trade_status: ["open", "closed"],
      user_role: ["trader", "superadmin"],
    },
  },
} as const
