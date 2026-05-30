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
          ddd: string | null
          ddi: string | null
          display_local: string | null
          e164: string | null
          feedback: Database["public"]["Enums"]["feedback_type"] | null
          gestor_id: string | null
          id: string
          is_mobile: boolean | null
          lead_id: string
          motivo_validacao: string | null
          nome: string
          numero_core: string | null
          observacao: string | null
          processado_por: string | null
          status_fila: Database["public"]["Enums"]["bitrix_status"]
          telefone: string
          telefone_raw: string | null
          timestamp_criacao: string
          timestamp_processamento: string | null
          validacao: string | null
          whatsapp_url: string | null
        }
        Insert: {
          campanha_id?: string | null
          corretor_id?: string | null
          ddd?: string | null
          ddi?: string | null
          display_local?: string | null
          e164?: string | null
          feedback?: Database["public"]["Enums"]["feedback_type"] | null
          gestor_id?: string | null
          id?: string
          is_mobile?: boolean | null
          lead_id: string
          motivo_validacao?: string | null
          nome: string
          numero_core?: string | null
          observacao?: string | null
          processado_por?: string | null
          status_fila?: Database["public"]["Enums"]["bitrix_status"]
          telefone: string
          telefone_raw?: string | null
          timestamp_criacao?: string
          timestamp_processamento?: string | null
          validacao?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          campanha_id?: string | null
          corretor_id?: string | null
          ddd?: string | null
          ddi?: string | null
          display_local?: string | null
          e164?: string | null
          feedback?: Database["public"]["Enums"]["feedback_type"] | null
          gestor_id?: string | null
          id?: string
          is_mobile?: boolean | null
          lead_id?: string
          motivo_validacao?: string | null
          nome?: string
          numero_core?: string | null
          observacao?: string | null
          processado_por?: string | null
          status_fila?: Database["public"]["Enums"]["bitrix_status"]
          telefone?: string
          telefone_raw?: string | null
          timestamp_criacao?: string
          timestamp_processamento?: string | null
          validacao?: string | null
          whatsapp_url?: string | null
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
      contatos_errados: {
        Row: {
          campanha_id: string | null
          corretor_id: string | null
          created_at: string
          ddd: string | null
          ddi: string | null
          display_local: string | null
          e164: string | null
          email: string | null
          flagged_at: string
          flagged_by: string | null
          gestor_id: string | null
          id: string
          is_mobile: boolean | null
          motivo_validacao: string | null
          nome: string
          numero_core: string | null
          observacao: string | null
          original_lead_id: string
          reason: string
          telefone: string
          telefone_raw: string | null
          validacao: string | null
          whatsapp_url: string | null
        }
        Insert: {
          campanha_id?: string | null
          corretor_id?: string | null
          created_at?: string
          ddd?: string | null
          ddi?: string | null
          display_local?: string | null
          e164?: string | null
          email?: string | null
          flagged_at?: string
          flagged_by?: string | null
          gestor_id?: string | null
          id?: string
          is_mobile?: boolean | null
          motivo_validacao?: string | null
          nome: string
          numero_core?: string | null
          observacao?: string | null
          original_lead_id: string
          reason?: string
          telefone: string
          telefone_raw?: string | null
          validacao?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          campanha_id?: string | null
          corretor_id?: string | null
          created_at?: string
          ddd?: string | null
          ddi?: string | null
          display_local?: string | null
          e164?: string | null
          email?: string | null
          flagged_at?: string
          flagged_by?: string | null
          gestor_id?: string | null
          id?: string
          is_mobile?: boolean | null
          motivo_validacao?: string | null
          nome?: string
          numero_core?: string | null
          observacao?: string | null
          original_lead_id?: string
          reason?: string
          telefone?: string
          telefone_raw?: string | null
          validacao?: string | null
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      disparo_copies: {
        Row: {
          ativa: boolean
          created_at: string
          id: string
          inclui_eflyer: boolean
          ordem: number
          plantao_id: string
          taxa_optout: number | null
          taxa_resposta: number | null
          texto: string
          vezes_usada: number
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          id?: string
          inclui_eflyer?: boolean
          ordem: number
          plantao_id: string
          taxa_optout?: number | null
          taxa_resposta?: number | null
          texto: string
          vezes_usada?: number
        }
        Update: {
          ativa?: boolean
          created_at?: string
          id?: string
          inclui_eflyer?: boolean
          ordem?: number
          plantao_id?: string
          taxa_optout?: number | null
          taxa_resposta?: number | null
          texto?: string
          vezes_usada?: number
        }
        Relationships: [
          {
            foreignKeyName: "disparo_copies_plantao_id_fkey"
            columns: ["plantao_id"]
            isOneToOne: false
            referencedRelation: "disparo_plantoes"
            referencedColumns: ["id"]
          },
        ]
      }
      disparo_fila: {
        Row: {
          agendado_para: string | null
          bitrix_lead_id: string | null
          copy_id: string | null
          created_at: string
          email: string | null
          enviado_em: string | null
          evolution_msg_id: string | null
          id: string
          motivo_falha: string | null
          nome: string
          origem: string | null
          plantao_id: string
          status: Database["public"]["Enums"]["disparo_fila_status"]
          telefone: string
          telefone_norm: string
          tentativas: number
          updated_at: string
        }
        Insert: {
          agendado_para?: string | null
          bitrix_lead_id?: string | null
          copy_id?: string | null
          created_at?: string
          email?: string | null
          enviado_em?: string | null
          evolution_msg_id?: string | null
          id?: string
          motivo_falha?: string | null
          nome: string
          origem?: string | null
          plantao_id: string
          status?: Database["public"]["Enums"]["disparo_fila_status"]
          telefone: string
          telefone_norm: string
          tentativas?: number
          updated_at?: string
        }
        Update: {
          agendado_para?: string | null
          bitrix_lead_id?: string | null
          copy_id?: string | null
          created_at?: string
          email?: string | null
          enviado_em?: string | null
          evolution_msg_id?: string | null
          id?: string
          motivo_falha?: string | null
          nome?: string
          origem?: string | null
          plantao_id?: string
          status?: Database["public"]["Enums"]["disparo_fila_status"]
          telefone?: string
          telefone_norm?: string
          tentativas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disparo_fila_copy_id_fkey"
            columns: ["copy_id"]
            isOneToOne: false
            referencedRelation: "disparo_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparo_fila_plantao_id_fkey"
            columns: ["plantao_id"]
            isOneToOne: false
            referencedRelation: "disparo_plantoes"
            referencedColumns: ["id"]
          },
        ]
      }
      disparo_logs: {
        Row: {
          evento: Database["public"]["Enums"]["disparo_log_evento"]
          evolution_msg_id: string | null
          fila_id: string | null
          id: string
          plantao_id: string
          raw_payload: Json | null
          timestamp: string
        }
        Insert: {
          evento: Database["public"]["Enums"]["disparo_log_evento"]
          evolution_msg_id?: string | null
          fila_id?: string | null
          id?: string
          plantao_id: string
          raw_payload?: Json | null
          timestamp?: string
        }
        Update: {
          evento?: Database["public"]["Enums"]["disparo_log_evento"]
          evolution_msg_id?: string | null
          fila_id?: string | null
          id?: string
          plantao_id?: string
          raw_payload?: Json | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "disparo_logs_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "disparo_fila"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparo_logs_plantao_id_fkey"
            columns: ["plantao_id"]
            isOneToOne: false
            referencedRelation: "disparo_plantoes"
            referencedColumns: ["id"]
          },
        ]
      }
      disparo_plantoes: {
        Row: {
          bitrix_funil_id: string | null
          chip_instance: string
          concluido_em: string | null
          corretores_handoff: string[]
          created_at: string
          created_by: string | null
          descricao: string | null
          eflyer_url: string | null
          id: string
          iniciado_em: string | null
          janelas: Json
          modo_handoff: string
          nome: string
          pausado_em: string | null
          pilares: Json
          ritmo_max_seg: number
          ritmo_min_seg: number
          status: Database["public"]["Enums"]["plantao_status"]
          total_entregues: number
          total_enviados: number
          total_falhas: number
          total_leads: number
          total_lidos: number
          total_optout: number
          total_respostas: number
          updated_at: string
          video_url: string | null
          volume_max_dia: number
        }
        Insert: {
          bitrix_funil_id?: string | null
          chip_instance: string
          concluido_em?: string | null
          corretores_handoff?: string[]
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          eflyer_url?: string | null
          id?: string
          iniciado_em?: string | null
          janelas?: Json
          modo_handoff?: string
          nome: string
          pausado_em?: string | null
          pilares?: Json
          ritmo_max_seg?: number
          ritmo_min_seg?: number
          status?: Database["public"]["Enums"]["plantao_status"]
          total_entregues?: number
          total_enviados?: number
          total_falhas?: number
          total_leads?: number
          total_lidos?: number
          total_optout?: number
          total_respostas?: number
          updated_at?: string
          video_url?: string | null
          volume_max_dia?: number
        }
        Update: {
          bitrix_funil_id?: string | null
          chip_instance?: string
          concluido_em?: string | null
          corretores_handoff?: string[]
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          eflyer_url?: string | null
          id?: string
          iniciado_em?: string | null
          janelas?: Json
          modo_handoff?: string
          nome?: string
          pausado_em?: string | null
          pilares?: Json
          ritmo_max_seg?: number
          ritmo_min_seg?: number
          status?: Database["public"]["Enums"]["plantao_status"]
          total_entregues?: number
          total_enviados?: number
          total_falhas?: number
          total_leads?: number
          total_lidos?: number
          total_optout?: number
          total_respostas?: number
          updated_at?: string
          video_url?: string | null
          volume_max_dia?: number
        }
        Relationships: [
          {
            foreignKeyName: "disparo_plantoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disparo_respostas: {
        Row: {
          bitrix_lead_id: string | null
          classificacao: Database["public"]["Enums"]["resposta_classificacao"]
          classificacao_manual: boolean
          classificacao_motivo: string | null
          classificacao_score: number | null
          created_at: string
          fila_id: string | null
          handoff_status: Database["public"]["Enums"]["handoff_status"]
          id: string
          mensagem: string
          nome: string | null
          observacao: string | null
          pego_em: string | null
          pego_por: string | null
          plantao_id: string
          raw_payload: Json | null
          recebido_em: string
          telefone: string
          telefone_norm: string
          travado_ate: string | null
          updated_at: string
        }
        Insert: {
          bitrix_lead_id?: string | null
          classificacao?: Database["public"]["Enums"]["resposta_classificacao"]
          classificacao_manual?: boolean
          classificacao_motivo?: string | null
          classificacao_score?: number | null
          created_at?: string
          fila_id?: string | null
          handoff_status?: Database["public"]["Enums"]["handoff_status"]
          id?: string
          mensagem: string
          nome?: string | null
          observacao?: string | null
          pego_em?: string | null
          pego_por?: string | null
          plantao_id: string
          raw_payload?: Json | null
          recebido_em?: string
          telefone: string
          telefone_norm: string
          travado_ate?: string | null
          updated_at?: string
        }
        Update: {
          bitrix_lead_id?: string | null
          classificacao?: Database["public"]["Enums"]["resposta_classificacao"]
          classificacao_manual?: boolean
          classificacao_motivo?: string | null
          classificacao_score?: number | null
          created_at?: string
          fila_id?: string | null
          handoff_status?: Database["public"]["Enums"]["handoff_status"]
          id?: string
          mensagem?: string
          nome?: string | null
          observacao?: string | null
          pego_em?: string | null
          pego_por?: string | null
          plantao_id?: string
          raw_payload?: Json | null
          recebido_em?: string
          telefone?: string
          telefone_norm?: string
          travado_ate?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disparo_respostas_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "disparo_fila"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparo_respostas_pego_por_fkey"
            columns: ["pego_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparo_respostas_plantao_id_fkey"
            columns: ["plantao_id"]
            isOneToOne: false
            referencedRelation: "disparo_plantoes"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs_telefone_normalizacao: {
        Row: {
          amostra_issues_json: Json | null
          created_at: string
          executado_por: string | null
          finished_at: string | null
          id: string
          incompleto: number | null
          invalido: number | null
          ok: number | null
          parametros_json: Json | null
          started_at: string
          tipo: string
          total_processados: number | null
          vazios: number | null
        }
        Insert: {
          amostra_issues_json?: Json | null
          created_at?: string
          executado_por?: string | null
          finished_at?: string | null
          id?: string
          incompleto?: number | null
          invalido?: number | null
          ok?: number | null
          parametros_json?: Json | null
          started_at?: string
          tipo: string
          total_processados?: number | null
          vazios?: number | null
        }
        Update: {
          amostra_issues_json?: Json | null
          created_at?: string
          executado_por?: string | null
          finished_at?: string | null
          id?: string
          incompleto?: number | null
          invalido?: number | null
          ok?: number | null
          parametros_json?: Json | null
          started_at?: string
          tipo?: string
          total_processados?: number | null
          vazios?: number | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          campanha_id: string | null
          corretor_id: string | null
          created_at: string
          data_atendimento: string | null
          ddd: string | null
          ddi: string | null
          display_local: string | null
          e164: string | null
          email: string | null
          feedback: Database["public"]["Enums"]["feedback_type"] | null
          gestor_id: string | null
          id: string
          is_mobile: boolean | null
          motivo_validacao: string | null
          nome: string
          numero_core: string | null
          observacao: string | null
          repassar_bitrix: boolean | null
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string
          telefone_raw: string | null
          tentativas_contato: number
          updated_at: string
          validacao: string | null
          whatsapp_url: string | null
        }
        Insert: {
          campanha_id?: string | null
          corretor_id?: string | null
          created_at?: string
          data_atendimento?: string | null
          ddd?: string | null
          ddi?: string | null
          display_local?: string | null
          e164?: string | null
          email?: string | null
          feedback?: Database["public"]["Enums"]["feedback_type"] | null
          gestor_id?: string | null
          id?: string
          is_mobile?: boolean | null
          motivo_validacao?: string | null
          nome: string
          numero_core?: string | null
          observacao?: string | null
          repassar_bitrix?: boolean | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone: string
          telefone_raw?: string | null
          tentativas_contato?: number
          updated_at?: string
          validacao?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          campanha_id?: string | null
          corretor_id?: string | null
          created_at?: string
          data_atendimento?: string | null
          ddd?: string | null
          ddi?: string | null
          display_local?: string | null
          e164?: string | null
          email?: string | null
          feedback?: Database["public"]["Enums"]["feedback_type"] | null
          gestor_id?: string | null
          id?: string
          is_mobile?: boolean | null
          motivo_validacao?: string | null
          nome?: string
          numero_core?: string | null
          observacao?: string | null
          repassar_bitrix?: boolean | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string
          telefone_raw?: string | null
          tentativas_contato?: number
          updated_at?: string
          validacao?: string | null
          whatsapp_url?: string | null
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
      nao_atendidos: {
        Row: {
          campanha_id: string | null
          campanha_nome: string | null
          corretor_id: string | null
          created_at: string
          ddd: string | null
          ddi: string | null
          display_local: string | null
          e164: string | null
          email: string | null
          flagged_at: string
          flagged_by: string | null
          gestor_id: string | null
          id: string
          is_mobile: boolean | null
          motivo_validacao: string | null
          nome: string
          numero_core: string | null
          observacao: string | null
          original_lead_id: string
          telefone: string
          telefone_raw: string | null
          tentativas_contato: number
          validacao: string | null
          whatsapp_url: string | null
        }
        Insert: {
          campanha_id?: string | null
          campanha_nome?: string | null
          corretor_id?: string | null
          created_at?: string
          ddd?: string | null
          ddi?: string | null
          display_local?: string | null
          e164?: string | null
          email?: string | null
          flagged_at?: string
          flagged_by?: string | null
          gestor_id?: string | null
          id?: string
          is_mobile?: boolean | null
          motivo_validacao?: string | null
          nome: string
          numero_core?: string | null
          observacao?: string | null
          original_lead_id: string
          telefone: string
          telefone_raw?: string | null
          tentativas_contato?: number
          validacao?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          campanha_id?: string | null
          campanha_nome?: string | null
          corretor_id?: string | null
          created_at?: string
          ddd?: string | null
          ddi?: string | null
          display_local?: string | null
          e164?: string | null
          email?: string | null
          flagged_at?: string
          flagged_by?: string | null
          gestor_id?: string | null
          id?: string
          is_mobile?: boolean | null
          motivo_validacao?: string | null
          nome?: string
          numero_core?: string | null
          observacao?: string | null
          original_lead_id?: string
          telefone?: string
          telefone_raw?: string | null
          tentativas_contato?: number
          validacao?: string | null
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      optout_contacts: {
        Row: {
          campanha_id: string | null
          corretor_id: string | null
          created_at: string
          ddd: string | null
          ddi: string | null
          display_local: string | null
          e164: string | null
          email: string | null
          flagged_at: string
          flagged_by: string | null
          gestor_id: string | null
          id: string
          is_mobile: boolean | null
          motivo_validacao: string | null
          nome: string
          numero_core: string | null
          observacao: string | null
          original_lead_id: string
          telefone: string
          telefone_raw: string | null
          validacao: string | null
          whatsapp_url: string | null
        }
        Insert: {
          campanha_id?: string | null
          corretor_id?: string | null
          created_at?: string
          ddd?: string | null
          ddi?: string | null
          display_local?: string | null
          e164?: string | null
          email?: string | null
          flagged_at?: string
          flagged_by?: string | null
          gestor_id?: string | null
          id?: string
          is_mobile?: boolean | null
          motivo_validacao?: string | null
          nome: string
          numero_core?: string | null
          observacao?: string | null
          original_lead_id: string
          telefone: string
          telefone_raw?: string | null
          validacao?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          campanha_id?: string | null
          corretor_id?: string | null
          created_at?: string
          ddd?: string | null
          ddi?: string | null
          display_local?: string | null
          e164?: string | null
          email?: string | null
          flagged_at?: string
          flagged_by?: string | null
          gestor_id?: string | null
          id?: string
          is_mobile?: boolean | null
          motivo_validacao?: string | null
          nome?: string
          numero_core?: string | null
          observacao?: string | null
          original_lead_id?: string
          telefone?: string
          telefone_raw?: string | null
          validacao?: string | null
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          gestor_id: string | null
          id: string
          meta_diaria: number | null
          name: string
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
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
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
      get_user_gestor_id: { Args: { _user_id: string }; Returns: string }
      handoff_pegar: {
        Args: { _corretor_id: string; _lock_min?: number; _resposta_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      norm_telefone_br: { Args: { _tel: string }; Returns: string }
      recalc_plantao_stats: {
        Args: { _plantao_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "corretor"
      assignment_status: "pendente" | "concluido"
      bitrix_status: "pendente" | "processado" | "erro" | "descartado"
      disparo_fila_status:
        | "aguardando"
        | "enviado"
        | "falhou"
        | "optout_pre"
        | "cancelado"
      disparo_log_evento: "enviado" | "entregue" | "lido" | "falha"
      feedback_type:
        | "interessado"
        | "agendado"
        | "recusou"
        | "optout"
        | "numero_errado"
        | "nao_atendeu"
      handoff_status:
        | "aguardando"
        | "em_atendimento"
        | "concluido"
        | "descartado"
      lead_status: "pendente" | "atendido" | "nao_atendido"
      plantao_status:
        | "rascunho"
        | "aprovado"
        | "ativo"
        | "pausado"
        | "concluido"
        | "cancelado"
      resposta_classificacao:
        | "interessado"
        | "frio"
        | "optout"
        | "outro"
        | "pendente"
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
      disparo_fila_status: [
        "aguardando",
        "enviado",
        "falhou",
        "optout_pre",
        "cancelado",
      ],
      disparo_log_evento: ["enviado", "entregue", "lido", "falha"],
      feedback_type: [
        "interessado",
        "agendado",
        "recusou",
        "optout",
        "numero_errado",
        "nao_atendeu",
      ],
      handoff_status: [
        "aguardando",
        "em_atendimento",
        "concluido",
        "descartado",
      ],
      lead_status: ["pendente", "atendido", "nao_atendido"],
      plantao_status: [
        "rascunho",
        "aprovado",
        "ativo",
        "pausado",
        "concluido",
        "cancelado",
      ],
      resposta_classificacao: [
        "interessado",
        "frio",
        "optout",
        "outro",
        "pendente",
      ],
      user_status: ["ativo", "inativo"],
    },
  },
} as const
