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
      assignments: {
        Row: {
          campanha_id: string | null
          corretor_id: string
          gestor_id: string | null
          id: string
          lead_id: string
          status_distribuicao: Database["public"]["Enums"]["assignment_status"]
          timestamp_atribuicao: string
        }
        Insert: {
          campanha_id?: string | null
          corretor_id: string
          gestor_id?: string | null
          id?: string
          lead_id: string
          status_distribuicao?: Database["public"]["Enums"]["assignment_status"]
          timestamp_atribuicao?: string
        }
        Update: {
          campanha_id?: string | null
          corretor_id?: string
          gestor_id?: string | null
          id?: string
          lead_id?: string
          status_distribuicao?: Database["public"]["Enums"]["assignment_status"]
          timestamp_atribuicao?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      bitrix_queue: {
        Row: {
          campanha_id: string | null
          corretor_id: string | null
          feedback: Database["public"]["Enums"]["feedback_type"] | null
          gestor_id: string | null
          id: string
          lead_id: string
          nome: string
          observacao: string | null
          processado_por: string | null
          status_fila: Database["public"]["Enums"]["bitrix_status"]
          telefone: string
          timestamp_criacao: string
          timestamp_processamento: string | null
        }
        Insert: {
          campanha_id?: string | null
          corretor_id?: string | null
          feedback?: Database["public"]["Enums"]["feedback_type"] | null
          gestor_id?: string | null
          id?: string
          lead_id: string
          nome: string
          observacao?: string | null
          processado_por?: string | null
          status_fila?: Database["public"]["Enums"]["bitrix_status"]
          telefone: string
          timestamp_criacao?: string
          timestamp_processamento?: string | null
        }
        Update: {
          campanha_id?: string | null
          corretor_id?: string | null
          feedback?: Database["public"]["Enums"]["feedback_type"] | null
          gestor_id?: string | null
          id?: string
          lead_id?: string
          nome?: string
          observacao?: string | null
          processado_por?: string | null
          status_fila?: Database["public"]["Enums"]["bitrix_status"]
          telefone?: string
          timestamp_criacao?: string
          timestamp_processamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bitrix_queue_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitrix_queue_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitrix_queue_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitrix_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitrix_queue_processado_por_fkey"
            columns: ["processado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          created_at: string
          data_upload: string
          gestor_id: string | null
          id: string
          nome: string
          total_leads: number
        }
        Insert: {
          created_at?: string
          data_upload?: string
          gestor_id?: string | null
          id?: string
          nome: string
          total_leads?: number
        }
        Update: {
          created_at?: string
          data_upload?: string
          gestor_id?: string | null
          id?: string
          nome?: string
          total_leads?: number
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campanha_id: string | null
          corretor_id: string | null
          created_at: string
          data_atendimento: string | null
          email: string | null
          feedback: Database["public"]["Enums"]["feedback_type"] | null
          gestor_id: string | null
          id: string
          nome: string
          observacao: string | null
          repassar_bitrix: boolean | null
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string
          updated_at: string
        }
        Insert: {
          campanha_id?: string | null
          corretor_id?: string | null
          created_at?: string
          data_atendimento?: string | null
          email?: string | null
          feedback?: Database["public"]["Enums"]["feedback_type"] | null
          gestor_id?: string | null
          id?: string
          nome: string
          observacao?: string | null
          repassar_bitrix?: boolean | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone: string
          updated_at?: string
        }
        Update: {
          campanha_id?: string | null
          corretor_id?: string | null
          created_at?: string
          data_atendimento?: string | null
          email?: string | null
          feedback?: Database["public"]["Enums"]["feedback_type"] | null
          gestor_id?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          repassar_bitrix?: boolean | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          gestor_id: string | null
          id: string
          meta_diaria: number | null
          name: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          gestor_id?: string | null
          id: string
          meta_diaria?: number | null
          name: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          gestor_id?: string | null
          id?: string
          meta_diaria?: number | null
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_gestor_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "corretor"
      assignment_status: "pendente" | "concluido"
      bitrix_status: "pendente" | "processado" | "erro" | "descartado"
      feedback_type: "interessado" | "agendado" | "recusou" | "optout"
      lead_status: "pendente" | "atendido" | "nao_atendido"
      user_status: "ativo" | "inativo"
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
      app_role: ["admin", "gestor", "corretor"],
      assignment_status: ["pendente", "concluido"],
      bitrix_status: ["pendente", "processado", "erro", "descartado"],
      feedback_type: ["interessado", "agendado", "recusou", "optout"],
      lead_status: ["pendente", "atendido", "nao_atendido"],
      user_status: ["ativo", "inativo"],
    },
  },
} as const
