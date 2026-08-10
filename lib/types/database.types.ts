export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          company_id: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string
          bank_code: string | null
          company_id: string
          created_at: string
          currency: string
          fio_token_ref: string | null
          iban: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          account_number: string
          bank_code?: string | null
          company_id: string
          created_at?: string
          currency?: string
          fio_token_ref?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          account_number?: string
          bank_code?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          fio_token_ref?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          company_id: string
          counterparty_account: string | null
          counterparty_name: string | null
          created_at: string
          currency: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          id: string
          import_batch_id: string | null
          import_hash: string | null
          is_demo: boolean
          message_for_recipient: string | null
          note: string | null
          source: string
          transaction_date: string
          variable_symbol: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          company_id: string
          counterparty_account?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          id?: string
          import_batch_id?: string | null
          import_hash?: string | null
          is_demo?: boolean
          message_for_recipient?: string | null
          note?: string | null
          source?: string
          transaction_date: string
          variable_symbol?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          company_id?: string
          counterparty_account?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string
          direction?: Database["public"]["Enums"]["transaction_direction"]
          id?: string
          import_batch_id?: string | null
          import_hash?: string | null
          is_demo?: boolean
          message_for_recipient?: string | null
          note?: string | null
          source?: string
          transaction_date?: string
          variable_symbol?: string | null
        }
        Relationships: []
      }
      business_partners: {
        Row: {
          address: string | null
          bank_account_number: string | null
          company_id: string
          created_at: string
          dic: string | null
          email: string | null
          ico: string | null
          id: string
          name: string
          note: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account_number?: string | null
          company_id: string
          created_at?: string
          dic?: string | null
          email?: string | null
          ico?: string | null
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account_number?: string | null
          company_id?: string
          created_at?: string
          dic?: string | null
          email?: string | null
          ico?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          company_id: string
          created_at: string
          direction: Database["public"]["Enums"]["document_direction"] | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          company_id: string
          created_at?: string
          direction?: Database["public"]["Enums"]["document_direction"] | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["document_direction"] | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          country: string
          created_at: string
          currency: string
          dic: string | null
          email: string | null
          ico: string
          id: string
          is_demo: boolean
          name: string
          phone: string | null
          regnote: string | null
          updated_at: string
          vat_payer: boolean
        }
        Insert: {
          address?: string | null
          country?: string
          created_at?: string
          currency?: string
          dic?: string | null
          email?: string | null
          ico: string
          id?: string
          is_demo?: boolean
          name: string
          phone?: string | null
          regnote?: string | null
          updated_at?: string
          vat_payer?: boolean
        }
        Update: {
          address?: string | null
          country?: string
          created_at?: string
          currency?: string
          dic?: string | null
          email?: string | null
          ico?: string
          id?: string
          is_demo?: boolean
          name?: string
          phone?: string | null
          regnote?: string | null
          updated_at?: string
          vat_payer?: boolean
        }
        Relationships: []
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      document_files: {
        Row: {
          company_id: string
          created_at: string
          document_id: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          document_id: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          document_id?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          amount_excl_vat: number
          amount_total: number
          category_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          customer_address: string | null
          customer_name: string | null
          direction: Database["public"]["Enums"]["document_direction"]
          doc_type: Database["public"]["Enums"]["document_type"]
          document_number: string | null
          due_date: string | null
          external_id: string | null
          external_source: string | null
          id: string
          is_archived: boolean
          is_demo: boolean
          issue_date: string | null
          note: string | null
          paid_date: string | null
          partner_dic: string | null
          partner_ico: string | null
          partner_id: string | null
          payment_bank_account: string | null
          payment_iban: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          project_id: string | null
          revenue_source: string | null
          status: Database["public"]["Enums"]["document_status"]
          taxable_supply_date: string | null
          updated_at: string
          variable_symbol: string | null
          vat_amount: number
          vat_rate: Database["public"]["Enums"]["vat_rate"]
        }
        Insert: {
          amount_excl_vat?: number
          amount_total?: number
          category_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_address?: string | null
          customer_name?: string | null
          direction: Database["public"]["Enums"]["document_direction"]
          doc_type?: Database["public"]["Enums"]["document_type"]
          document_number?: string | null
          due_date?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          is_archived?: boolean
          is_demo?: boolean
          issue_date?: string | null
          note?: string | null
          paid_date?: string | null
          partner_dic?: string | null
          partner_ico?: string | null
          partner_id?: string | null
          payment_bank_account?: string | null
          payment_iban?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          project_id?: string | null
          revenue_source?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          taxable_supply_date?: string | null
          updated_at?: string
          variable_symbol?: string | null
          vat_amount?: number
          vat_rate?: Database["public"]["Enums"]["vat_rate"]
        }
        Update: {
          amount_excl_vat?: number
          amount_total?: number
          category_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_address?: string | null
          customer_name?: string | null
          direction?: Database["public"]["Enums"]["document_direction"]
          doc_type?: Database["public"]["Enums"]["document_type"]
          document_number?: string | null
          due_date?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          is_archived?: boolean
          is_demo?: boolean
          issue_date?: string | null
          note?: string | null
          paid_date?: string | null
          partner_dic?: string | null
          partner_ico?: string | null
          partner_id?: string | null
          payment_bank_account?: string | null
          payment_iban?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          project_id?: string | null
          revenue_source?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          taxable_supply_date?: string | null
          updated_at?: string
          variable_symbol?: string | null
          vat_amount?: number
          vat_rate?: Database["public"]["Enums"]["vat_rate"]
        }
        Relationships: []
      }
      payment_matches: {
        Row: {
          bank_transaction_id: string
          company_id: string
          confidence_score: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          document_id: string
          id: string
          match_reason: string | null
          matched_amount: number
          status: Database["public"]["Enums"]["match_status"]
        }
        Insert: {
          bank_transaction_id: string
          company_id: string
          confidence_score?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          document_id: string
          id?: string
          match_reason?: string | null
          matched_amount: number
          status?: Database["public"]["Enums"]["match_status"]
        }
        Update: {
          bank_transaction_id?: string
          company_id?: string
          confidence_score?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          document_id?: string
          id?: string
          match_reason?: string | null
          matched_amount?: number
          status?: Database["public"]["Enums"]["match_status"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      document_line_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          document_id: string
          id: string
          position: number
          quantity: number
          unit: string
          unit_price: number
          vat_rate_percent: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string
          document_id: string
          id?: string
          position?: number
          quantity?: number
          unit?: string
          unit_price?: number
          vat_rate_percent?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          document_id?: string
          id?: string
          position?: number
          quantity?: number
          unit?: string
          unit_price?: number
          vat_rate_percent?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      import_fio_bar_payment: {
        Args: {
          p_amount: number
          p_fio_transaction_id: string
          p_message_for_recipient: string | null
          p_payer_account: string | null
          p_payer_name: string | null
          p_secret: string
          p_transaction_date: string
          p_variable_symbol: string | null
        }
        Returns: string
      }
      import_padel_reservation: {
        Args: {
          p_amount: number
          p_court_name: string | null
          p_customer_name: string | null
          p_end_time: string | null
          p_paid_at: string | null
          p_payment_method: string | null
          p_reservation_date: string
          p_reservation_id: string
          p_secret: string
          p_start_time: string | null
          p_variable_symbol: string | null
          p_venue_name: string | null
        }
        Returns: string
      }
      user_company_role: {
        Args: { target_company_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      user_has_company_access: {
        Args: { target_company_id: string }
        Returns: boolean
      }
    }
    Enums: {
      document_direction: "prijaty" | "vydany"
      document_status:
        | "novy"
        | "ke_kontrole"
        | "schvaleny"
        | "ceka_na_uhradu"
        | "zaplaceny"
        | "chybi_doklad"
        | "predany_ucetni"
      document_type:
        | "faktura"
        | "zalohova_faktura"
        | "dobropis"
        | "pokladni_doklad"
        | "smlouva"
        | "ostatni"
      match_status: "navrzeno" | "potvrzeno" | "zamitnuto"
      payment_method: "prevod" | "hotovost" | "karta" | "ostatni"
      transaction_direction: "prichozi" | "odchozi"
      user_role: "administrator" | "uzivatel" | "ucetni"
      vat_rate:
        | "zakladni"
        | "snizena"
        | "druha_snizena"
        | "osvobozeno"
        | "mimo_dph"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<
  T extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][T]["Update"]

export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T]
