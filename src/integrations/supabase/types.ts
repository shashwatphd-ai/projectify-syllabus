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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      company_profiles: {
        Row: {
          apollo_enrichment_date: string | null
          buying_intent_signals: Json | null
          city: string | null
          contact_city: string | null
          contact_country: string | null
          contact_email: string | null
          contact_email_status: string | null
          contact_employment_history: Json | null
          contact_first_name: string | null
          contact_headline: string | null
          contact_last_name: string | null
          contact_person: string | null
          contact_phone: string | null
          contact_phone_numbers: Json | null
          contact_photo_url: string | null
          contact_state: string | null
          contact_title: string | null
          contact_twitter_url: string | null
          data_completeness_score: number | null
          data_enrichment_level: string | null
          discovery_source: string | null
          full_address: string | null
          funding_stage: string | null
          generation_run_id: string | null
          id: string
          inferred_needs: Json | null
          job_postings: Json | null
          job_postings_last_fetched: string | null
          last_enriched_at: string
          last_verified_at: string | null
          linkedin_profile: string | null
          name: string
          open_roles: Json | null
          organization_employee_count: string | null
          organization_facebook_url: string | null
          organization_founded_year: number | null
          organization_industry_keywords: Json | null
          organization_linkedin_url: string | null
          organization_logo_url: string | null
          organization_revenue_range: string | null
          organization_twitter_url: string | null
          recent_news: string | null
          sector: string | null
          size: string | null
          source: string | null
          technologies: Json | null
          technologies_used: Json | null
          total_funding_usd: number | null
          website: string | null
          zip: string | null
        }
        Insert: {
          apollo_enrichment_date?: string | null
          buying_intent_signals?: Json | null
          city?: string | null
          contact_city?: string | null
          contact_country?: string | null
          contact_email?: string | null
          contact_email_status?: string | null
          contact_employment_history?: Json | null
          contact_first_name?: string | null
          contact_headline?: string | null
          contact_last_name?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_phone_numbers?: Json | null
          contact_photo_url?: string | null
          contact_state?: string | null
          contact_title?: string | null
          contact_twitter_url?: string | null
          data_completeness_score?: number | null
          data_enrichment_level?: string | null
          discovery_source?: string | null
          full_address?: string | null
          funding_stage?: string | null
          generation_run_id?: string | null
          id?: string
          inferred_needs?: Json | null
          job_postings?: Json | null
          job_postings_last_fetched?: string | null
          last_enriched_at?: string
          last_verified_at?: string | null
          linkedin_profile?: string | null
          name: string
          open_roles?: Json | null
          organization_employee_count?: string | null
          organization_facebook_url?: string | null
          organization_founded_year?: number | null
          organization_industry_keywords?: Json | null
          organization_linkedin_url?: string | null
          organization_logo_url?: string | null
          organization_revenue_range?: string | null
          organization_twitter_url?: string | null
          recent_news?: string | null
          sector?: string | null
          size?: string | null
          source?: string | null
          technologies?: Json | null
          technologies_used?: Json | null
          total_funding_usd?: number | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          apollo_enrichment_date?: string | null
          buying_intent_signals?: Json | null
          city?: string | null
          contact_city?: string | null
          contact_country?: string | null
          contact_email?: string | null
          contact_email_status?: string | null
          contact_employment_history?: Json | null
          contact_first_name?: string | null
          contact_headline?: string | null
          contact_last_name?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_phone_numbers?: Json | null
          contact_photo_url?: string | null
          contact_state?: string | null
          contact_title?: string | null
          contact_twitter_url?: string | null
          data_completeness_score?: number | null
          data_enrichment_level?: string | null
          discovery_source?: string | null
          full_address?: string | null
          funding_stage?: string | null
          generation_run_id?: string | null
          id?: string
          inferred_needs?: Json | null
          job_postings?: Json | null
          job_postings_last_fetched?: string | null
          last_enriched_at?: string
          last_verified_at?: string | null
          linkedin_profile?: string | null
          name?: string
          open_roles?: Json | null
          organization_employee_count?: string | null
          organization_facebook_url?: string | null
          organization_founded_year?: number | null
          organization_industry_keywords?: Json | null
          organization_linkedin_url?: string | null
          organization_logo_url?: string | null
          organization_revenue_range?: string | null
          organization_twitter_url?: string | null
          recent_news?: string | null
          sector?: string | null
          size?: string | null
          source?: string | null
          technologies?: Json | null
          technologies_used?: Json | null
          total_funding_usd?: number | null
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_generation_run_id_fkey"
            columns: ["generation_run_id"]
            isOneToOne: false
            referencedRelation: "generation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      course_profiles: {
        Row: {
          artifacts: Json
          city_zip: string | null
          created_at: string
          file_path: string | null
          hrs_per_week: number
          id: string
          level: string
          outcomes: Json
          owner_id: string
          schedule: Json | null
          title: string
          weeks: number
        }
        Insert: {
          artifacts: Json
          city_zip?: string | null
          created_at?: string
          file_path?: string | null
          hrs_per_week: number
          id?: string
          level: string
          outcomes: Json
          owner_id: string
          schedule?: Json | null
          title: string
          weeks: number
        }
        Update: {
          artifacts?: Json
          city_zip?: string | null
          created_at?: string
          file_path?: string | null
          hrs_per_week?: number
          id?: string
          level?: string
          outcomes?: Json
          owner_id?: string
          schedule?: Json | null
          title?: string
          weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_profiles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          alignment: number | null
          comments: string | null
          created_at: string
          evaluator_id: string
          evaluator_role: Database["public"]["Enums"]["app_role"]
          feasibility: number | null
          fit: number | null
          id: string
          liked: boolean
          project_id: string
        }
        Insert: {
          alignment?: number | null
          comments?: string | null
          created_at?: string
          evaluator_id: string
          evaluator_role: Database["public"]["Enums"]["app_role"]
          feasibility?: number | null
          fit?: number | null
          id?: string
          liked: boolean
          project_id: string
        }
        Update: {
          alignment?: number | null
          comments?: string | null
          created_at?: string
          evaluator_id?: string
          evaluator_role?: Database["public"]["Enums"]["app_role"]
          feasibility?: number | null
          fit?: number | null
          id?: string
          liked?: boolean
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_runs: {
        Row: {
          ai_models_used: Json | null
          ai_tokens_consumed: number | null
          apollo_credits_used: number | null
          companies_discovered: number | null
          companies_enriched: number | null
          completed_at: string | null
          course_id: string
          created_at: string
          error_message: string | null
          id: string
          industries: Json | null
          location: string | null
          num_teams: number
          processing_time_seconds: number | null
          projects_generated: number | null
          specific_companies: Json | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_models_used?: Json | null
          ai_tokens_consumed?: number | null
          apollo_credits_used?: number | null
          companies_discovered?: number | null
          companies_enriched?: number | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          industries?: Json | null
          location?: string | null
          num_teams: number
          processing_time_seconds?: number | null
          projects_generated?: number | null
          specific_companies?: Json | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_models_used?: Json | null
          ai_tokens_consumed?: number | null
          apollo_credits_used?: number | null
          companies_discovered?: number | null
          companies_enriched?: number | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          industries?: Json | null
          location?: string | null
          num_teams?: number
          processing_time_seconds?: number | null
          projects_generated?: number | null
          specific_companies?: Json | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_runs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_proposals: {
        Row: {
          company_profile_id: string | null
          created_at: string
          id: string
          message: string | null
          pitch_type: string | null
          project_id: string
          proposer_email: string
          proposer_id: string
          proposer_name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company_profile_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          pitch_type?: string | null
          project_id: string
          proposer_email: string
          proposer_id: string
          proposer_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_profile_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          pitch_type?: string | null
          project_id?: string
          proposer_email?: string
          proposer_id?: string
          proposer_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_proposals_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      project_forms: {
        Row: {
          form1: Json
          form2: Json
          form3: Json
          form4: Json
          form5: Json
          form6: Json
          id: string
          milestones: Json
          project_id: string
        }
        Insert: {
          form1: Json
          form2: Json
          form3: Json
          form4: Json
          form5: Json
          form6: Json
          id?: string
          milestones: Json
          project_id: string
        }
        Update: {
          form1?: Json
          form2?: Json
          form3?: Json
          form4?: Json
          form5?: Json
          form6?: Json
          id?: string
          milestones?: Json
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_metadata: {
        Row: {
          ai_model_version: string | null
          ai_prompts_used: Json | null
          algorithm_version: string | null
          companies_considered: Json | null
          created_at: string | null
          generation_timestamp: string | null
          id: string
          lo_alignment_detail: Json | null
          lo_mapping_deliverables: Json | null
          lo_mapping_tasks: Json | null
          market_signals_used: Json | null
          project_id: string
          scoring_rationale: Json | null
          selection_criteria: Json | null
        }
        Insert: {
          ai_model_version?: string | null
          ai_prompts_used?: Json | null
          algorithm_version?: string | null
          companies_considered?: Json | null
          created_at?: string | null
          generation_timestamp?: string | null
          id?: string
          lo_alignment_detail?: Json | null
          lo_mapping_deliverables?: Json | null
          lo_mapping_tasks?: Json | null
          market_signals_used?: Json | null
          project_id: string
          scoring_rationale?: Json | null
          selection_criteria?: Json | null
        }
        Update: {
          ai_model_version?: string | null
          ai_prompts_used?: Json | null
          algorithm_version?: string | null
          companies_considered?: Json | null
          created_at?: string | null
          generation_timestamp?: string | null
          id?: string
          lo_alignment_detail?: Json | null
          lo_mapping_deliverables?: Json | null
          lo_mapping_tasks?: Json | null
          market_signals_used?: Json | null
          project_id?: string
          scoring_rationale?: Json | null
          selection_criteria?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "project_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          company_name: string
          company_profile_id: string | null
          course_id: string
          created_at: string
          deliverables: Json
          duration_weeks: number
          feasibility_score: number
          final_score: number
          generation_run_id: string | null
          id: string
          lo_score: number
          mutual_benefit_score: number
          needs_review: boolean | null
          pricing_usd: number
          sector: string
          tasks: Json
          team_size: number
          tier: string
          title: string
        }
        Insert: {
          company_name: string
          company_profile_id?: string | null
          course_id: string
          created_at?: string
          deliverables: Json
          duration_weeks: number
          feasibility_score: number
          final_score: number
          generation_run_id?: string | null
          id?: string
          lo_score: number
          mutual_benefit_score: number
          needs_review?: boolean | null
          pricing_usd: number
          sector: string
          tasks: Json
          team_size: number
          tier: string
          title: string
        }
        Update: {
          company_name?: string
          company_profile_id?: string | null
          course_id?: string
          created_at?: string
          deliverables?: Json
          duration_weeks?: number
          feasibility_score?: number
          final_score?: number
          generation_run_id?: string | null
          id?: string
          lo_score?: number
          mutual_benefit_score?: number
          needs_review?: boolean | null
          pricing_usd?: number
          sector?: string
          tasks?: Json
          team_size?: number
          tier?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_generation_run_id_fkey"
            columns: ["generation_run_id"]
            isOneToOne: false
            referencedRelation: "generation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assign_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "faculty" | "student"
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
      app_role: ["faculty", "student"],
    },
  },
} as const
