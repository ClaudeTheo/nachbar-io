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
      access_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          created_by_role: string
          expires_at: string
          failed_attempts: number | null
          id: string
          patient_birth_date: string | null
          patient_name: string
          quarter_id: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by: string
          created_by_role: string
          expires_at?: string
          failed_attempts?: number | null
          id?: string
          patient_birth_date?: string | null
          patient_name: string
          quarter_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          created_by_role?: string
          expires_at?: string
          failed_attempts?: number | null
          id?: string
          patient_birth_date?: string | null
          patient_name?: string
          quarter_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_access_logs: {
        Row: {
          access_type: string
          admin_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          access_type?: string
          admin_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          reason: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_expenses: {
        Row: {
          admin_id: string | null
          amount_cents: number
          category: string
          created_at: string | null
          currency: string | null
          date: string
          description: string
          id: string
          receipt_id: string | null
          receipt_url: string | null
          vendor: string | null
        }
        Insert: {
          admin_id?: string | null
          amount_cents: number
          category: string
          created_at?: string | null
          currency?: string | null
          date: string
          description: string
          id?: string
          receipt_id?: string | null
          receipt_url?: string | null
          vendor?: string | null
        }
        Update: {
          admin_id?: string | null
          amount_cents?: number
          category?: string
          created_at?: string | null
          currency?: string | null
          date?: string
          description?: string
          id?: string
          receipt_id?: string | null
          receipt_url?: string | null
          vendor?: string | null
        }
        Relationships: []
      }
      alert_responses: {
        Row: {
          alert_id: string
          created_at: string
          id: string
          message: string | null
          responder_user_id: string
          response_type: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          id?: string
          message?: string | null
          responder_user_id: string
          response_type?: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          id?: string
          message?: string | null
          responder_user_id?: string
          response_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_responses_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_responses_responder_user_id_fkey"
            columns: ["responder_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          current_radius: number
          description: string | null
          household_id: string
          id: string
          is_emergency: boolean
          location_lat: number | null
          location_lng: number | null
          location_source: string | null
          quarter_id: string | null
          resolved_at: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string
          current_radius?: number
          description?: string | null
          household_id: string
          id?: string
          is_emergency?: boolean
          location_lat?: number | null
          location_lng?: number | null
          location_source?: string | null
          quarter_id?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          current_radius?: number
          description?: string | null
          household_id?: string
          id?: string
          is_emergency?: boolean
          location_lat?: number | null
          location_lng?: number | null
          location_source?: string | null
          quarter_id?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "alerts_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      amtsblatt_issues: {
        Row: {
          created_at: string | null
          error_message: string | null
          extracted_count: number | null
          id: string
          issue_date: string
          issue_number: string
          pages: number | null
          pdf_url: string
          quarter_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          extracted_count?: number | null
          id?: string
          issue_date: string
          issue_number: string
          pages?: number | null
          pdf_url: string
          quarter_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          extracted_count?: number | null
          id?: string
          issue_date?: string
          issue_number?: string
          pages?: number | null
          pdf_url?: string
          quarter_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "amtsblatt_issues_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "amtsblatt_issues_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          activation_rate: number | null
          active_orgs: number
          active_users_30d: number
          active_users_7d: number
          checkin_frequency: number | null
          created_at: string
          escalation_count: number
          events_count: number
          heartbeat_coverage: number | null
          id: string
          invite_conversion_rate: number | null
          invite_converted: number
          invite_sent: number
          mrr: number | null
          new_registrations: number
          plus_subscribers: number
          posts_count: number
          quarter_id: string
          retention_30d: number | null
          retention_7d: number | null
          rsvp_count: number
          snapshot_date: string
          total_users: number
          wah: number
        }
        Insert: {
          activation_rate?: number | null
          active_orgs?: number
          active_users_30d?: number
          active_users_7d?: number
          checkin_frequency?: number | null
          created_at?: string
          escalation_count?: number
          events_count?: number
          heartbeat_coverage?: number | null
          id?: string
          invite_conversion_rate?: number | null
          invite_converted?: number
          invite_sent?: number
          mrr?: number | null
          new_registrations?: number
          plus_subscribers?: number
          posts_count?: number
          quarter_id: string
          retention_30d?: number | null
          retention_7d?: number | null
          rsvp_count?: number
          snapshot_date?: string
          total_users?: number
          wah?: number
        }
        Update: {
          activation_rate?: number | null
          active_orgs?: number
          active_users_30d?: number
          active_users_7d?: number
          checkin_frequency?: number | null
          created_at?: string
          escalation_count?: number
          events_count?: number
          heartbeat_coverage?: number | null
          id?: string
          invite_conversion_rate?: number | null
          invite_converted?: number
          invite_sent?: number
          mrr?: number | null
          new_registrations?: number
          plus_subscribers?: number
          posts_count?: number
          quarter_id?: string
          retention_30d?: number | null
          retention_7d?: number | null
          rsvp_count?: number
          snapshot_date?: string
          total_users?: number
          wah?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "analytics_snapshots_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_forms: {
        Row: {
          appointment_id: string | null
          doctor_id: string
          form_data_encrypted: string
          id: string
          patient_id: string | null
          submitted_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          doctor_id: string
          form_data_encrypted: string
          id?: string
          patient_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          doctor_id?: string
          form_data_encrypted?: string
          id?: string
          patient_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_forms_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string | null
          doctor_id: string
          duration_minutes: number | null
          id: string
          meeting_url: string | null
          notes_encrypted: string | null
          patient_email: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          reminder_sent: boolean | null
          scheduled_at: string
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          duration_minutes?: number | null
          id?: string
          meeting_url?: string | null
          notes_encrypted?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          reminder_sent?: boolean | null
          scheduled_at: string
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          duration_minutes?: number | null
          id?: string
          meeting_url?: string | null
          notes_encrypted?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          reminder_sent?: boolean | null
          scheduled_at?: string
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          request_id: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          request_id?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          request_id?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      board_comments: {
        Row: {
          created_at: string
          id: string
          post_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_report_rate_limits: {
        Row: {
          fingerprint_hash: string
          id: string
          report_count: number
          window_start: string
        }
        Insert: {
          fingerprint_hash: string
          id?: string
          report_count?: number
          window_start?: string
        }
        Update: {
          fingerprint_hash?: string
          id?: string
          report_count?: number
          window_start?: string
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          admin_notes: string | null
          browser_info: Json | null
          console_errors: Json | null
          created_at: string | null
          id: string
          ip_hash: string | null
          page_meta: Json | null
          page_title: string | null
          page_url: string
          quarter_id: string | null
          reviewed_at: string | null
          screenshot_url: string | null
          source: string
          status: string | null
          user_comment: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          browser_info?: Json | null
          console_errors?: Json | null
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          page_meta?: Json | null
          page_title?: string | null
          page_url: string
          quarter_id?: string | null
          reviewed_at?: string | null
          screenshot_url?: string | null
          source?: string
          status?: string | null
          user_comment?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          browser_info?: Json | null
          console_errors?: Json | null
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          page_meta?: Json | null
          page_title?: string | null
          page_url?: string
          quarter_id?: string | null
          reviewed_at?: string | null
          screenshot_url?: string | null
          source?: string
          status?: string | null
          user_comment?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "bug_reports_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          bank_bic: string | null
          bank_iban: string | null
          bank_name: string | null
          business_form: string
          company_address: string | null
          company_name: string
          id: string
          invoice_footer_text: string | null
          invoice_prefix: string
          kleinunternehmer: boolean
          tax_id: string | null
          updated_at: string | null
          updated_by: string | null
          ust_id: string | null
        }
        Insert: {
          bank_bic?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          business_form?: string
          company_address?: string | null
          company_name?: string
          id?: string
          invoice_footer_text?: string | null
          invoice_prefix?: string
          kleinunternehmer?: boolean
          tax_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          ust_id?: string | null
        }
        Update: {
          bank_bic?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          business_form?: string
          company_address?: string | null
          company_name?: string
          id?: string
          invoice_footer_text?: string | null
          invoice_prefix?: string
          kleinunternehmer?: boolean
          tax_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          ust_id?: string | null
        }
        Relationships: []
      }
      business_transactions: {
        Row: {
          amount_cents: number
          booked_at: string
          business_form: string | null
          category: string
          counterparty: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string
          id: string
          invoice_number: string | null
          is_storno: boolean | null
          net_amount_cents: number | null
          period_end: string | null
          period_start: string | null
          receipt_url: string | null
          reference: string | null
          storno_of: string | null
          stripe_invoice_id: string | null
          stripe_payment_id: string | null
          tax_amount_cents: number | null
          tax_rate: number | null
          type: string
        }
        Insert: {
          amount_cents: number
          booked_at?: string
          business_form?: string | null
          category: string
          counterparty?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description: string
          id?: string
          invoice_number?: string | null
          is_storno?: boolean | null
          net_amount_cents?: number | null
          period_end?: string | null
          period_start?: string | null
          receipt_url?: string | null
          reference?: string | null
          storno_of?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_id?: string | null
          tax_amount_cents?: number | null
          tax_rate?: number | null
          type: string
        }
        Update: {
          amount_cents?: number
          booked_at?: string
          business_form?: string | null
          category?: string
          counterparty?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          is_storno?: boolean | null
          net_amount_cents?: number | null
          period_end?: string | null
          period_start?: string | null
          receipt_url?: string | null
          reference?: string | null
          storno_of?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_id?: string | null
          tax_amount_cents?: number | null
          tax_rate?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_transactions_storno_of_fkey"
            columns: ["storno_of"]
            isOneToOne: false
            referencedRelation: "business_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      care_appointments: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string
          location: string | null
          managed_by: string | null
          notes: string | null
          recurrence: Json | null
          reminder_minutes_before: number[] | null
          scheduled_at: string
          senior_id: string
          title: string
          type: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          managed_by?: string | null
          notes?: string | null
          recurrence?: Json | null
          reminder_minutes_before?: number[] | null
          scheduled_at: string
          senior_id: string
          title: string
          type?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          managed_by?: string | null
          notes?: string | null
          recurrence?: Json | null
          reminder_minutes_before?: number[] | null
          scheduled_at?: string
          senior_id?: string
          title?: string
          type?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_appointments_managed_by_fkey"
            columns: ["managed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_appointments_senior_id_fkey"
            columns: ["senior_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_audit_log: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          senior_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          senior_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          senior_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_audit_log_senior_id_fkey"
            columns: ["senior_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_checkins: {
        Row: {
          completed_at: string | null
          created_at: string | null
          escalated: boolean | null
          id: string
          mood: string | null
          note: string | null
          reminder_sent_at: string | null
          scheduled_at: string
          senior_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          escalated?: boolean | null
          id?: string
          mood?: string | null
          note?: string | null
          reminder_sent_at?: string | null
          scheduled_at: string
          senior_id: string
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          escalated?: boolean | null
          id?: string
          mood?: string | null
          note?: string | null
          reminder_sent_at?: string | null
          scheduled_at?: string
          senior_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_checkins_senior_id_fkey"
            columns: ["senior_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_consent_history: {
        Row: {
          action: string
          consent_id: string
          consent_version: string
          created_at: string
          feature: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          consent_id: string
          consent_version: string
          created_at?: string
          feature: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          consent_id?: string
          consent_version?: string
          created_at?: string
          feature?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_consent_history_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "care_consents"
            referencedColumns: ["id"]
          },
        ]
      }
      care_consents: {
        Row: {
          consent_version: string
          created_at: string
          feature: string
          granted: boolean
          granted_at: string | null
          id: string
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_version?: string
          created_at?: string
          feature: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_version?: string
          created_at?: string
          feature?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      care_documents: {
        Row: {
          created_at: string | null
          file_size_bytes: number | null
          generated_by: string
          id: string
          period_end: string | null
          period_start: string | null
          senior_id: string
          storage_path: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          file_size_bytes?: number | null
          generated_by: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          senior_id: string
          storage_path: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          file_size_bytes?: number | null
          generated_by?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          senior_id?: string
          storage_path?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_documents_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_documents_senior_id_fkey"
            columns: ["senior_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_helpers: {
        Row: {
          assigned_seniors: string[] | null
          availability: Json | null
          avg_response_minutes: number | null
          created_at: string | null
          id: string
          response_count: number | null
          role: string
          skills: string[] | null
          updated_at: string | null
          user_id: string
          verification_status: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_seniors?: string[] | null
          availability?: Json | null
          avg_response_minutes?: number | null
          created_at?: string | null
          id?: string
          response_count?: number | null
          role: string
          skills?: string[] | null
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_seniors?: string[] | null
          availability?: Json | null
          avg_response_minutes?: number | null
          created_at?: string | null
          id?: string
          response_count?: number | null
          role?: string
          skills?: string[] | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_helpers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_helpers_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_medication_logs: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          id: string
          medication_id: string
          scheduled_at: string
          senior_id: string
          snoozed_until: string | null
          status: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          medication_id: string
          scheduled_at: string
          senior_id: string
          snoozed_until?: string | null
          status: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          medication_id?: string
          scheduled_at?: string
          senior_id?: string
          snoozed_until?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "care_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_medication_logs_senior_id_fkey"
            columns: ["senior_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_medications: {
        Row: {
          active: boolean | null
          created_at: string | null
          dosage: string | null
          id: string
          instructions: string | null
          managed_by: string | null
          name: string
          schedule: Json
          senior_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          dosage?: string | null
          id?: string
          instructions?: string | null
          managed_by?: string | null
          name: string
          schedule: Json
          senior_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          dosage?: string | null
          id?: string
          instructions?: string | null
          managed_by?: string | null
          name?: string
          schedule?: Json
          senior_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_medications_managed_by_fkey"
            columns: ["managed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_medications_senior_id_fkey"
            columns: ["senior_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_profiles: {
        Row: {
          care_level: string | null
          checkin_enabled: boolean | null
          checkin_times: Json | null
          created_at: string | null
          emergency_contacts: Json | null
          escalation_config: Json | null
          id: string
          insurance_number: string | null
          medical_notes: string | null
          preferred_hospital: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          care_level?: string | null
          checkin_enabled?: boolean | null
          checkin_times?: Json | null
          created_at?: string | null
          emergency_contacts?: Json | null
          escalation_config?: Json | null
          id?: string
          insurance_number?: string | null
          medical_notes?: string | null
          preferred_hospital?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          care_level?: string | null
          checkin_enabled?: boolean | null
          checkin_times?: Json | null
          created_at?: string | null
          emergency_contacts?: Json | null
          escalation_config?: Json | null
          id?: string
          insurance_number?: string | null
          medical_notes?: string | null
          preferred_hospital?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_profiles_hilfe: {
        Row: {
          care_level: number | null
          created_at: string | null
          id: string
          insurance_name: string
          insurance_number_encrypted: string
          monthly_budget_cents: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          care_level?: number | null
          created_at?: string | null
          id?: string
          insurance_name: string
          insurance_number_encrypted: string
          monthly_budget_cents?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          care_level?: number | null
          created_at?: string | null
          id?: string
          insurance_name?: string
          insurance_number_encrypted?: string
          monthly_budget_cents?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      care_shopping_requests: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          confirmed_at: string | null
          created_at: string | null
          delivered_at: string | null
          due_date: string | null
          id: string
          items: Json
          note: string | null
          quarter_id: string
          requester_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          due_date?: string | null
          id?: string
          items?: Json
          note?: string | null
          quarter_id: string
          requester_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          due_date?: string | null
          id?: string
          items?: Json
          note?: string | null
          quarter_id?: string
          requester_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_shopping_requests_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_shopping_requests_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "care_shopping_requests_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_shopping_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_sos_alerts: {
        Row: {
          accepted_by: string | null
          category: string
          created_at: string | null
          current_escalation_level: number | null
          escalated_at: string[] | null
          id: string
          notes: string | null
          quarter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          senior_id: string
          source: string | null
          status: string
        }
        Insert: {
          accepted_by?: string | null
          category: string
          created_at?: string | null
          current_escalation_level?: number | null
          escalated_at?: string[] | null
          id?: string
          notes?: string | null
          quarter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          senior_id: string
          source?: string | null
          status?: string
        }
        Update: {
          accepted_by?: string | null
          category?: string
          created_at?: string | null
          current_escalation_level?: number | null
          escalated_at?: string[] | null
          id?: string
          notes?: string | null
          quarter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          senior_id?: string
          source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_sos_alerts_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_sos_alerts_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "care_sos_alerts_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_sos_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_sos_alerts_senior_id_fkey"
            columns: ["senior_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_sos_responses: {
        Row: {
          created_at: string | null
          eta_minutes: number | null
          helper_id: string
          id: string
          note: string | null
          response_type: string
          sos_alert_id: string
        }
        Insert: {
          created_at?: string | null
          eta_minutes?: number | null
          helper_id: string
          id?: string
          note?: string | null
          response_type: string
          sos_alert_id: string
        }
        Update: {
          created_at?: string | null
          eta_minutes?: number | null
          helper_id?: string
          id?: string
          note?: string | null
          response_type?: string
          sos_alert_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_sos_responses_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_sos_responses_sos_alert_id_fkey"
            columns: ["sos_alert_id"]
            isOneToOne: false
            referencedRelation: "care_sos_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      care_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          external_subscription_id: string | null
          id: string
          payment_provider: string | null
          plan: string | null
          status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          external_subscription_id?: string | null
          id?: string
          payment_provider?: string | null
          plan?: string | null
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          external_subscription_id?: string | null
          id?: string
          payment_provider?: string | null
          plan?: string | null
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_tasks: {
        Row: {
          category: string
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          preferred_date: string | null
          preferred_time_from: string | null
          preferred_time_to: string | null
          quarter_id: string
          status: string
          title: string
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          category?: string
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          preferred_date?: string | null
          preferred_time_from?: string | null
          preferred_time_to?: string | null
          quarter_id: string
          status?: string
          title: string
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          category?: string
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          preferred_date?: string | null
          preferred_time_from?: string | null
          preferred_time_to?: string | null
          quarter_id?: string
          status?: string
          title?: string
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_tasks_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_tasks_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_tasks_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "care_tasks_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      care_visits: {
        Row: {
          caregiver_user_id: string | null
          created_at: string
          id: string
          next_visit_planned: string | null
          notes_encrypted: string | null
          org_id: string
          resident_id: string
          visit_type: string
          visited_at: string
        }
        Insert: {
          caregiver_user_id?: string | null
          created_at?: string
          id?: string
          next_visit_planned?: string | null
          notes_encrypted?: string | null
          org_id: string
          resident_id: string
          visit_type: string
          visited_at?: string
        }
        Update: {
          caregiver_user_id?: string | null
          created_at?: string
          id?: string
          next_visit_planned?: string | null
          notes_encrypted?: string | null
          org_id?: string
          resident_id?: string
          visit_type?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_visits_caregiver_user_id_fkey"
            columns: ["caregiver_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_visits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_visits_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_invites: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invite_code: string
          resident_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          invite_code: string
          resident_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invite_code?: string
          resident_id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      caregiver_links: {
        Row: {
          auto_answer_allowed: boolean
          auto_answer_end: string
          auto_answer_start: string
          caregiver_id: string
          created_at: string
          heartbeat_visible: boolean
          id: string
          plus_trial_end: string | null
          relationship_type: string
          resident_id: string
          revoked_at: string | null
        }
        Insert: {
          auto_answer_allowed?: boolean
          auto_answer_end?: string
          auto_answer_start?: string
          caregiver_id: string
          created_at?: string
          heartbeat_visible?: boolean
          id?: string
          plus_trial_end?: string | null
          relationship_type: string
          resident_id: string
          revoked_at?: string | null
        }
        Update: {
          auto_answer_allowed?: boolean
          auto_answer_end?: string
          auto_answer_start?: string
          caregiver_id?: string
          created_at?: string
          heartbeat_visible?: boolean
          id?: string
          plus_trial_end?: string | null
          relationship_type?: string
          resident_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_caregiver_links_caregiver"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_caregiver_links_resident"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_events: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          resident_id: string
          scheduled_at: string
          title: string
          who_comes: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          resident_id: string
          scheduled_at: string
          title: string
          who_comes?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          resident_id?: string
          scheduled_at?: string
          title?: string
          who_comes?: string
        }
        Relationships: []
      }
      citizen_reports: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          internal_notes: string | null
          latitude: number | null
          longitude: number | null
          org_id: string | null
          photo_url: string | null
          priority: string
          reported_by: string | null
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          internal_notes?: string | null
          latitude?: number | null
          longitude?: number | null
          org_id?: string | null
          photo_url?: string | null
          priority?: string
          reported_by?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          internal_notes?: string | null
          latitude?: number | null
          longitude?: number | null
          org_id?: string | null
          photo_url?: string | null
          priority?: string
          reported_by?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "citizen_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      civic_announcements: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          priority: string
          published_at: string | null
          target_quarters: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          priority?: string
          published_at?: string | null
          target_quarters?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          priority?: string
          published_at?: string | null
          target_quarters?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "civic_announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      civic_appointments: {
        Row: {
          citizen_name: string
          created_at: string
          created_by: string | null
          department: string | null
          id: string
          notes: string | null
          scheduled_at: string
          service_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          citizen_name: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          notes?: string | null
          scheduled_at: string
          service_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          citizen_name?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          service_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      civic_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          org_id: string | null
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          org_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          org_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "civic_audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      civic_document_requests: {
        Row: {
          citizen_email: string | null
          citizen_name: string
          created_at: string
          details: string | null
          document_type: string
          id: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          citizen_email?: string | null
          citizen_name: string
          created_at?: string
          details?: string | null
          document_type: string
          id?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          citizen_email?: string | null
          citizen_name?: string
          created_at?: string
          details?: string | null
          document_type?: string
          id?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      civic_events: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          location: string | null
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          location?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          location?: string | null
          title?: string
        }
        Relationships: []
      }
      civic_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "civic_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      civic_message_attachments: {
        Row: {
          created_at: string
          file_size: number
          filename: string
          id: string
          message_id: string
          mime_type: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_size: number
          filename: string
          id?: string
          message_id: string
          mime_type: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_size?: number
          filename?: string
          id?: string
          message_id?: string
          mime_type?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "civic_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "civic_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      civic_messages: {
        Row: {
          body_encrypted: string
          citizen_read_until: string | null
          citizen_user_id: string
          created_at: string | null
          direction: string
          id: string
          org_id: string
          read_at: string | null
          read_by: string | null
          sender_user_id: string
          status: string | null
          subject: string
          thread_id: string
        }
        Insert: {
          body_encrypted: string
          citizen_read_until?: string | null
          citizen_user_id: string
          created_at?: string | null
          direction?: string
          id?: string
          org_id: string
          read_at?: string | null
          read_by?: string | null
          sender_user_id: string
          status?: string | null
          subject: string
          thread_id: string
        }
        Update: {
          body_encrypted?: string
          citizen_read_until?: string | null
          citizen_user_id?: string
          created_at?: string | null
          direction?: string
          id?: string
          org_id?: string
          read_at?: string | null
          read_by?: string | null
          sender_user_id?: string
          status?: string | null
          subject?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "civic_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "civic_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "civic_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      civic_organizations: {
        Row: {
          address: string | null
          assigned_quarters: string[] | null
          created_at: string
          features: Json
          hr_vr_number: string | null
          id: string
          latitude: number | null
          longitude: number | null
          municipality: string | null
          name: string
          type: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          address?: string | null
          assigned_quarters?: string[] | null
          created_at?: string
          features?: Json
          hr_vr_number?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipality?: string | null
          name: string
          type?: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          address?: string | null
          assigned_quarters?: string[] | null
          created_at?: string
          features?: Json
          hr_vr_number?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipality?: string | null
          name?: string
          type?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      civic_survey_options: {
        Row: {
          id: string
          label: string
          sort_order: number
          survey_id: string
          vote_count: number
        }
        Insert: {
          id?: string
          label: string
          sort_order?: number
          survey_id: string
          vote_count?: number
        }
        Update: {
          id?: string
          label?: string
          sort_order?: number
          survey_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "civic_survey_options_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "civic_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      civic_survey_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          survey_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          survey_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "civic_survey_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "civic_survey_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "civic_survey_votes_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "civic_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      civic_surveys: {
        Row: {
          anonymous: boolean
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          start_date: string
          title: string
        }
        Insert: {
          anonymous?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          start_date: string
          title: string
        }
        Update: {
          anonymous?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          start_date?: string
          title?: string
        }
        Relationships: []
      }
      claude_messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          read_at: string | null
          recipient: string
          sender: string
          status: string | null
          subject: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient: string
          sender: string
          status?: string | null
          subject?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient?: string
          sender?: string
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      community_rules_violations: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          item_id: string
          item_type: string
          reason: string
          reported_user_id: string
          reporter_user_id: string
          reviewed_at: string | null
          status: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          reason: string
          reported_user_id: string
          reporter_user_id: string
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          reason?: string
          reported_user_id?: string
          reporter_user_id?: string
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_rules_violations_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_rules_violations_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      community_tips: {
        Row: {
          business_name: string | null
          category: string
          confirmation_count: number
          contact_hint: string | null
          created_at: string
          description: string
          email: string | null
          id: string
          images: string[] | null
          is_premium: boolean
          location_hint: string | null
          opening_hours: string | null
          phone: string | null
          service_area: string | null
          service_radius_km: number | null
          status: string
          subcategories: string[] | null
          title: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          business_name?: string | null
          category: string
          confirmation_count?: number
          contact_hint?: string | null
          created_at?: string
          description: string
          email?: string | null
          id?: string
          images?: string[] | null
          is_premium?: boolean
          location_hint?: string | null
          opening_hours?: string | null
          phone?: string | null
          service_area?: string | null
          service_radius_km?: number | null
          status?: string
          subcategories?: string[] | null
          title: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          business_name?: string | null
          category?: string
          confirmation_count?: number
          contact_hint?: string | null
          created_at?: string
          description?: string
          email?: string | null
          id?: string
          images?: string[] | null
          is_premium?: boolean
          location_hint?: string | null
          opening_hours?: string | null
          phone?: string | null
          service_area?: string | null
          service_radius_km?: number | null
          status?: string
          subcategories?: string[] | null
          title?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_tips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_chat_history: {
        Row: {
          created_at: string | null
          id: string
          messages: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      consent_grants: {
        Row: {
          granted_at: string
          grantee_id: string | null
          grantee_org_id: string | null
          id: string
          purpose: string
          revoked_at: string | null
          subject_id: string
        }
        Insert: {
          granted_at?: string
          grantee_id?: string | null
          grantee_org_id?: string | null
          id?: string
          purpose: string
          revoked_at?: string | null
          subject_id: string
        }
        Update: {
          granted_at?: string
          grantee_id?: string | null
          grantee_org_id?: string | null
          id?: string
          purpose?: string
          revoked_at?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_grants_grantee_org_id_fkey"
            columns: ["grantee_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_versions: {
        Row: {
          consent_type: string
          content_html: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          legal_basis: string | null
          text_de: string
          text_hash: string
          title: string | null
          valid_from: string
          valid_until: string | null
          version: string
        }
        Insert: {
          consent_type: string
          content_html?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          legal_basis?: string | null
          text_de: string
          text_hash: string
          title?: string | null
          valid_from?: string
          valid_until?: string | null
          version: string
        }
        Update: {
          consent_type?: string
          content_html?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          legal_basis?: string | null
          text_de?: string
          text_hash?: string
          title?: string | null
          valid_from?: string
          valid_until?: string | null
          version?: string
        }
        Relationships: []
      }
      construction_sites: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          description: string | null
          detour_info: string | null
          end_date: string | null
          id: string
          latitude: number
          longitude: number
          org_id: string
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          detour_info?: string | null
          end_date?: string | null
          id?: string
          latitude: number
          longitude: number
          org_id: string
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          detour_info?: string | null
          end_date?: string | null
          id?: string
          latitude?: number
          longitude?: number
          org_id?: string
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "construction_sites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_consents: {
        Row: {
          consent_version: string
          consented_at: string
          id: string
          provider_type: string
          user_id: string
        }
        Insert: {
          consent_version?: string
          consented_at?: string
          id?: string
          provider_type: string
          user_id: string
        }
        Update: {
          consent_version?: string
          consented_at?: string
          id?: string
          provider_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_slots: {
        Row: {
          booked_at: string | null
          booked_by: string | null
          cancelled_by: string | null
          counter_proposed_at: string | null
          created_at: string | null
          duration_minutes: number
          host_name: string
          host_url: string | null
          host_user_id: string | null
          id: string
          join_url: string | null
          notes: string | null
          previous_scheduled_at: string | null
          proposed_by: string | null
          provider_type: string
          quarter_id: string
          room_id: string | null
          scheduled_at: string
          so_appointment_id: string | null
          status: string
          status_changed_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          booked_at?: string | null
          booked_by?: string | null
          cancelled_by?: string | null
          counter_proposed_at?: string | null
          created_at?: string | null
          duration_minutes?: number
          host_name: string
          host_url?: string | null
          host_user_id?: string | null
          id?: string
          join_url?: string | null
          notes?: string | null
          previous_scheduled_at?: string | null
          proposed_by?: string | null
          provider_type: string
          quarter_id: string
          room_id?: string | null
          scheduled_at: string
          so_appointment_id?: string | null
          status?: string
          status_changed_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Update: {
          booked_at?: string | null
          booked_by?: string | null
          cancelled_by?: string | null
          counter_proposed_at?: string | null
          created_at?: string | null
          duration_minutes?: number
          host_name?: string
          host_url?: string | null
          host_user_id?: string | null
          id?: string
          join_url?: string | null
          notes?: string | null
          previous_scheduled_at?: string | null
          proposed_by?: string | null
          provider_type?: string
          quarter_id?: string
          room_id?: string | null
          scheduled_at?: string
          so_appointment_id?: string | null
          status?: string
          status_changed_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_slots_booked_by_fkey"
            columns: ["booked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_slots_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_slots_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "consultation_slots_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          reason_category: string
          reason_text: string | null
          report_weight: number | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          reason_category: string
          reason_text?: string | null
          report_weight?: number | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          reason_category?: string
          reason_text?: string | null
          report_weight?: number | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
          quarter_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
          quarter_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
          quarter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "conversations_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      craftsman_recommendations: {
        Row: {
          aspects: Json | null
          comment: string | null
          confirmed_usage: boolean
          created_at: string
          id: string
          recommends: boolean
          tip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aspects?: Json | null
          comment?: string | null
          confirmed_usage?: boolean
          created_at?: string
          id?: string
          recommends: boolean
          tip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aspects?: Json | null
          comment?: string | null
          confirmed_usage?: boolean
          created_at?: string
          id?: string
          recommends?: boolean
          tip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "craftsman_recommendations_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips"
            referencedColumns: ["id"]
          },
        ]
      }
      craftsman_usage_events: {
        Row: {
          created_at: string
          id: string
          note: string | null
          tip_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          tip_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          tip_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "craftsman_usage_events_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_alerts: {
        Row: {
          active: boolean
          affected_quarters: string[] | null
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          id: string
          instructions: string | null
          message: string
          org_id: string
          severity: string
          title: string
          type: string
        }
        Insert: {
          active?: boolean
          affected_quarters?: string[] | null
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          id?: string
          instructions?: string | null
          message: string
          org_id: string
          severity?: string
          title: string
          type?: string
        }
        Update: {
          active?: boolean
          affected_quarters?: string[] | null
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          id?: string
          instructions?: string | null
          message?: string
          org_id?: string
          severity?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crisis_alerts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_templates: {
        Row: {
          created_at: string
          id: string
          instructions: string | null
          message: string
          severity: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          message: string
          severity?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          message?: string
          severity?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      cron_heartbeats: {
        Row: {
          created_at: string
          job_id: string
          last_run_at: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          job_id: string
          last_run_at?: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          job_id?: string
          last_run_at?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      cron_job_runs: {
        Row: {
          completed_at: string | null
          error: string | null
          id: string
          job_name: string
          result: Json | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error?: string | null
          id?: string
          job_name: string
          result?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          error?: string | null
          id?: string
          job_name?: string
          result?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      cross_org_deliveries: {
        Row: {
          delivered_at: string
          display_content: Json
          hop_count: number
          id: string
          is_verified: boolean
          item_type: string
          request_id: string | null
          source_item_id: string
          source_org_id: string
          source_org_name: string
          target_org_id: string
          verified_by_org_name: string | null
        }
        Insert: {
          delivered_at?: string
          display_content: Json
          hop_count?: number
          id?: string
          is_verified?: boolean
          item_type: string
          request_id?: string | null
          source_item_id: string
          source_org_id: string
          source_org_name: string
          target_org_id: string
          verified_by_org_name?: string | null
        }
        Update: {
          delivered_at?: string
          display_content?: Json
          hop_count?: number
          id?: string
          is_verified?: boolean
          item_type?: string
          request_id?: string | null
          source_item_id?: string
          source_org_id?: string
          source_org_name?: string
          target_org_id?: string
          verified_by_org_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_org_deliveries_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cross_org_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_org_deliveries_source_org_id_fkey"
            columns: ["source_org_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_org_deliveries_target_org_id_fkey"
            columns: ["target_org_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_org_requests: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          expires_at: string
          id: string
          modified_by: string | null
          modified_content: Json | null
          original_content: Json
          request_type: string
          responded_at: string | null
          source_item_id: string
          source_org_id: string
          status: string
          target_org_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          modified_by?: string | null
          modified_content?: Json | null
          original_content: Json
          request_type: string
          responded_at?: string | null
          source_item_id: string
          source_org_id: string
          status?: string
          target_org_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          modified_by?: string | null
          modified_content?: Json | null
          original_content?: Json
          request_type?: string
          responded_at?: string | null
          source_item_id?: string
          source_org_id?: string
          status?: string
          target_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_org_requests_source_org_id_fkey"
            columns: ["source_org_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_org_requests_target_org_id_fkey"
            columns: ["target_org_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_breach_incidents: {
        Row: {
          admin_id: string | null
          affected_services: string[] | null
          affected_users: number | null
          authority_reference: string | null
          created_at: string | null
          description: string
          details: Json | null
          id: string
          postmortem: string | null
          reported_at: string | null
          reported_to_authority: boolean | null
          resolved_at: string | null
          severity: string
          status: string | null
          title: string | null
        }
        Insert: {
          admin_id?: string | null
          affected_services?: string[] | null
          affected_users?: number | null
          authority_reference?: string | null
          created_at?: string | null
          description: string
          details?: Json | null
          id?: string
          postmortem?: string | null
          reported_at?: string | null
          reported_to_authority?: boolean | null
          resolved_at?: string | null
          severity: string
          status?: string | null
          title?: string | null
        }
        Update: {
          admin_id?: string | null
          affected_services?: string[] | null
          affected_users?: number | null
          authority_reference?: string | null
          created_at?: string | null
          description?: string
          details?: Json | null
          id?: string
          postmortem?: string | null
          reported_at?: string | null
          reported_to_authority?: boolean | null
          resolved_at?: string | null
          severity?: string
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      data_requests: {
        Row: {
          admin_id: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string
          id: string
          notes: string | null
          request_type: string
          requester_email: string
          resolution_summary: string | null
          status: string
        }
        Insert: {
          admin_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          notes?: string | null
          request_type: string
          requester_email: string
          resolution_summary?: string | null
          status?: string
        }
        Update: {
          admin_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          request_type?: string
          requester_email?: string
          resolution_summary?: string | null
          status?: string
        }
        Relationships: []
      }
      data_retention_log: {
        Row: {
          checkins_deleted: number
          details: Json | null
          executed_at: string
          execution_ms: number | null
          heartbeats_deleted: number
          id: number
          sos_alerts_deleted: number
        }
        Insert: {
          checkins_deleted?: number
          details?: Json | null
          executed_at?: string
          execution_ms?: number | null
          heartbeats_deleted?: number
          id?: never
          sos_alerts_deleted?: number
        }
        Update: {
          checkins_deleted?: number
          details?: Json | null
          executed_at?: string
          execution_ms?: number | null
          heartbeats_deleted?: number
          id?: never
          sos_alerts_deleted?: number
        }
        Relationships: []
      }
      device_heartbeats: {
        Row: {
          cpu_temp_celsius: number
          created_at: string
          device_token_id: string
          id: string
          ram_percent: number
          restart_count: number
        }
        Insert: {
          cpu_temp_celsius: number
          created_at?: string
          device_token_id: string
          id?: string
          ram_percent: number
          restart_count?: number
        }
        Update: {
          cpu_temp_celsius?: number
          created_at?: string
          device_token_id?: string
          id?: string
          ram_percent?: number
          restart_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "device_heartbeats_device_token_id_fkey"
            columns: ["device_token_id"]
            isOneToOne: false
            referencedRelation: "device_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          device_name: string
          household_id: string
          id: string
          last_seen_at: string | null
          token: string
          token_hash: string | null
        }
        Insert: {
          created_at?: string
          device_name?: string
          household_id: string
          id?: string
          last_seen_at?: string | null
          token?: string
          token_hash?: string | null
        }
        Update: {
          created_at?: string
          device_name?: string
          household_id?: string
          id?: string
          last_seen_at?: string | null
          token?: string
          token_hash?: string | null
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_consents: {
        Row: {
          consent_text_hash: string
          consent_type: string
          consent_version_id: string | null
          granted_at: string
          id: string
          ip_address_hash: string | null
          magic_link_verified_at: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          consent_text_hash: string
          consent_type: string
          consent_version_id?: string | null
          granted_at?: string
          id?: string
          ip_address_hash?: string | null
          magic_link_verified_at?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          consent_text_hash?: string
          consent_type?: string
          consent_version_id?: string | null
          granted_at?: string
          id?: string
          ip_address_hash?: string | null
          magic_link_verified_at?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_consents_consent_version_id_fkey"
            columns: ["consent_version_id"]
            isOneToOne: false
            referencedRelation: "consent_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_profiles: {
        Row: {
          accepts_new_patients: boolean | null
          address: string | null
          admin_notes: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          org_id: string | null
          phone: string | null
          quarter_ids: string[] | null
          so_user_id: string | null
          specialization: string[] | null
          updated_at: string | null
          user_id: string
          video_consultation: boolean | null
          visible: boolean | null
        }
        Insert: {
          accepts_new_patients?: boolean | null
          address?: string | null
          admin_notes?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          org_id?: string | null
          phone?: string | null
          quarter_ids?: string[] | null
          so_user_id?: string | null
          specialization?: string[] | null
          updated_at?: string | null
          user_id: string
          video_consultation?: boolean | null
          visible?: boolean | null
        }
        Update: {
          accepts_new_patients?: boolean | null
          address?: string | null
          admin_notes?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          org_id?: string | null
          phone?: string | null
          quarter_ids?: string[] | null
          so_user_id?: string | null
          specialization?: string[] | null
          updated_at?: string | null
          user_id?: string
          video_consultation?: boolean | null
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_reviews: {
        Row: {
          created_at: string | null
          doctor_id: string
          id: string
          patient_id: string
          rating: number
          text: string | null
          visible: boolean | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          id?: string
          patient_id: string
          rating: number
          text?: string | null
          visible?: boolean | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          id?: string
          patient_id?: string
          rating?: number
          text?: string | null
          visible?: boolean | null
        }
        Relationships: []
      }
      emergency_profiles: {
        Row: {
          created_at: string
          id: string
          last_reminder_sent_at: string | null
          level1_encrypted: string
          level2_encrypted: string | null
          level3_encrypted: string | null
          pdf_token: string | null
          pdf_token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_reminder_sent_at?: string | null
          level1_encrypted: string
          level2_encrypted?: string | null
          level3_encrypted?: string | null
          pdf_token?: string | null
          pdf_token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_reminder_sent_at?: string | null
          level1_encrypted?: string
          level2_encrypted?: string | null
          level3_encrypted?: string | null
          pdf_token?: string | null
          pdf_token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_events: {
        Row: {
          id: string
          notified_users: string[]
          resident_id: string
          resolved_at: string | null
          stage: string
          triggered_at: string
        }
        Insert: {
          id?: string
          notified_users?: string[]
          resident_id: string
          resolved_at?: string | null
          stage: string
          triggered_at?: string
        }
        Update: {
          id?: string
          notified_users?: string[]
          resident_id?: string
          resolved_at?: string | null
          stage?: string
          triggered_at?: string
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_recaps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          images: string[] | null
          text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          images?: string[] | null
          text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          images?: string[] | null
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_recaps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          event_time: string | null
          id: string
          location: string | null
          max_participants: number | null
          parent_event_id: string | null
          quarter_id: string | null
          recurrence_end_date: string | null
          recurrence_rule: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          location?: string | null
          max_participants?: number | null
          parent_event_id?: string | null
          quarter_id?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          location?: string | null
          max_participants?: number | null
          parent_event_id?: string | null
          quarter_id?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "events_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_endorsements: {
        Row: {
          created_at: string
          endorser_user_id: string
          expert_user_id: string
          id: string
          skill_category: string
        }
        Insert: {
          created_at?: string
          endorser_user_id: string
          expert_user_id: string
          id?: string
          skill_category: string
        }
        Update: {
          created_at?: string
          endorser_user_id?: string
          expert_user_id?: string
          id?: string
          skill_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_endorsements_endorser_user_id_fkey"
            columns: ["endorser_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_endorsements_expert_user_id_fkey"
            columns: ["expert_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_reviews: {
        Row: {
          comment: string | null
          created_at: string
          expert_user_id: string
          id: string
          rating: number
          reviewer_user_id: string
          skill_category: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          expert_user_id: string
          id?: string
          rating: number
          reviewer_user_id: string
          skill_category: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          expert_user_id?: string
          id?: string
          rating?: number
          reviewer_user_id?: string
          skill_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_reviews_expert_user_id_fkey"
            columns: ["expert_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      external_warning_cache: {
        Row: {
          ars: string | null
          attribution_text: string
          attribution_url: string | null
          category: string | null
          created_at: string
          description: string | null
          event_code: string | null
          expires_at: string | null
          external_id: string
          external_version: string | null
          fetch_batch_id: string | null
          first_seen_at: string
          headline: string
          id: string
          instruction: string | null
          last_seen_at: string
          onset_at: string | null
          provider: Database["public"]["Enums"]["external_warning_provider"]
          quarter_id: string | null
          raw_payload: Json
          sent_at: string | null
          severity: Database["public"]["Enums"]["external_warning_severity"]
          status: Database["public"]["Enums"]["external_warning_status"]
          superseded_by: string | null
          updated_at: string
          warncell_id: string | null
        }
        Insert: {
          ars?: string | null
          attribution_text: string
          attribution_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          event_code?: string | null
          expires_at?: string | null
          external_id: string
          external_version?: string | null
          fetch_batch_id?: string | null
          first_seen_at?: string
          headline: string
          id?: string
          instruction?: string | null
          last_seen_at?: string
          onset_at?: string | null
          provider: Database["public"]["Enums"]["external_warning_provider"]
          quarter_id?: string | null
          raw_payload: Json
          sent_at?: string | null
          severity?: Database["public"]["Enums"]["external_warning_severity"]
          status?: Database["public"]["Enums"]["external_warning_status"]
          superseded_by?: string | null
          updated_at?: string
          warncell_id?: string | null
        }
        Update: {
          ars?: string | null
          attribution_text?: string
          attribution_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          event_code?: string | null
          expires_at?: string | null
          external_id?: string
          external_version?: string | null
          fetch_batch_id?: string | null
          first_seen_at?: string
          headline?: string
          id?: string
          instruction?: string | null
          last_seen_at?: string
          onset_at?: string | null
          provider?: Database["public"]["Enums"]["external_warning_provider"]
          quarter_id?: string | null
          raw_payload?: Json
          sent_at?: string | null
          severity?: Database["public"]["Enums"]["external_warning_severity"]
          status?: Database["public"]["Enums"]["external_warning_status"]
          superseded_by?: string | null
          updated_at?: string
          warncell_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_warning_cache_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "external_warning_cache_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_warning_cache_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "external_warning_cache"
            referencedColumns: ["id"]
          },
        ]
      }
      external_warning_sync_log: {
        Row: {
          ars: string | null
          batch_id: string
          error_details: Json | null
          error_message: string | null
          finished_at: string | null
          http_status: number | null
          id: string
          provider: Database["public"]["Enums"]["external_warning_provider"]
          quarter_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["sync_status"]
          warnings_expired: number | null
          warnings_fetched: number | null
          warnings_new: number | null
          warnings_unchanged: number | null
          warnings_updated: number | null
        }
        Insert: {
          ars?: string | null
          batch_id?: string
          error_details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          http_status?: number | null
          id?: string
          provider: Database["public"]["Enums"]["external_warning_provider"]
          quarter_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          warnings_expired?: number | null
          warnings_fetched?: number | null
          warnings_new?: number | null
          warnings_unchanged?: number | null
          warnings_updated?: number | null
        }
        Update: {
          ars?: string | null
          batch_id?: string
          error_details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          http_status?: number | null
          id?: string
          provider?: Database["public"]["Enums"]["external_warning_provider"]
          quarter_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          warnings_expired?: number | null
          warnings_fetched?: number | null
          warnings_new?: number | null
          warnings_unchanged?: number | null
          warnings_updated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_warning_sync_log_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "external_warning_sync_log_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          admin_override: boolean | null
          created_at: string
          description: string | null
          enabled: boolean
          enabled_quarters: string[] | null
          id: string
          key: string
          required_plans: string[] | null
          required_roles: string[] | null
          updated_at: string
        }
        Insert: {
          admin_override?: boolean | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          enabled_quarters?: string[] | null
          id?: string
          key: string
          required_plans?: string[] | null
          required_roles?: string[] | null
          updated_at?: string
        }
        Update: {
          admin_override?: boolean | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          enabled_quarters?: string[] | null
          id?: string
          key?: string
          required_plans?: string[] | null
          required_roles?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      federal_state_rules: {
        Row: {
          allowed_cleaning: boolean | null
          allowed_escort: boolean | null
          allowed_household: boolean | null
          allowed_lawn_mowing: boolean | null
          allowed_leisure: boolean | null
          allowed_shopping: boolean | null
          allowed_snow_removal: boolean | null
          direct_payment_possible: boolean | null
          formal_pre_registration: boolean | null
          hourly_rate_max_cents: number | null
          hourly_rate_min_cents: number | null
          hourly_rate_note: string | null
          insurance_note: string | null
          is_available: boolean | null
          last_checked: string | null
          max_concurrent_clients: number | null
          max_hourly_rate_cents: number | null
          min_age: number | null
          notes: string | null
          official_form_url: string | null
          primary_official_url: string | null
          recognition_type: string | null
          registration_authority: string | null
          reimbursement_principle: string | null
          relationship_exclusion_degree: number | null
          research_status: string | null
          same_household_excluded: boolean | null
          secondary_official_url: string | null
          state_code: string
          state_name: string
          tax_note: string | null
          training_hours: number | null
          training_required: boolean | null
        }
        Insert: {
          allowed_cleaning?: boolean | null
          allowed_escort?: boolean | null
          allowed_household?: boolean | null
          allowed_lawn_mowing?: boolean | null
          allowed_leisure?: boolean | null
          allowed_shopping?: boolean | null
          allowed_snow_removal?: boolean | null
          direct_payment_possible?: boolean | null
          formal_pre_registration?: boolean | null
          hourly_rate_max_cents?: number | null
          hourly_rate_min_cents?: number | null
          hourly_rate_note?: string | null
          insurance_note?: string | null
          is_available?: boolean | null
          last_checked?: string | null
          max_concurrent_clients?: number | null
          max_hourly_rate_cents?: number | null
          min_age?: number | null
          notes?: string | null
          official_form_url?: string | null
          primary_official_url?: string | null
          recognition_type?: string | null
          registration_authority?: string | null
          reimbursement_principle?: string | null
          relationship_exclusion_degree?: number | null
          research_status?: string | null
          same_household_excluded?: boolean | null
          secondary_official_url?: string | null
          state_code: string
          state_name: string
          tax_note?: string | null
          training_hours?: number | null
          training_required?: boolean | null
        }
        Update: {
          allowed_cleaning?: boolean | null
          allowed_escort?: boolean | null
          allowed_household?: boolean | null
          allowed_lawn_mowing?: boolean | null
          allowed_leisure?: boolean | null
          allowed_shopping?: boolean | null
          allowed_snow_removal?: boolean | null
          direct_payment_possible?: boolean | null
          formal_pre_registration?: boolean | null
          hourly_rate_max_cents?: number | null
          hourly_rate_min_cents?: number | null
          hourly_rate_note?: string | null
          insurance_note?: string | null
          is_available?: boolean | null
          last_checked?: string | null
          max_concurrent_clients?: number | null
          max_hourly_rate_cents?: number | null
          min_age?: number | null
          notes?: string | null
          official_form_url?: string | null
          primary_official_url?: string | null
          recognition_type?: string | null
          registration_authority?: string | null
          reimbursement_principle?: string | null
          relationship_exclusion_degree?: number | null
          research_status?: string | null
          same_household_excluded?: boolean | null
          secondary_official_url?: string | null
          state_code?: string
          state_name?: string
          tax_note?: string | null
          training_hours?: number | null
          training_required?: boolean | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_notification_settings: {
        Row: {
          group_id: string
          id: string
          muted: boolean
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          muted?: boolean
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          muted?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_notification_settings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          category: string
          created_at: string
          creator_id: string
          description: string | null
          id: string
          member_count: number
          name: string
          quarter_id: string
          type: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          member_count?: number
          name: string
          quarter_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          member_count?: number
          name?: string
          quarter_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "groups_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      heartbeats: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      help_matches: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          helper_id: string
          id: string
          request_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          helper_id: string
          id?: string
          request_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          helper_id?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_matches_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "neighborhood_helpers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      help_monthly_reports: {
        Row: {
          created_at: string | null
          helper_id: string
          id: string
          month_year: string
          pdf_url: string
          resident_id: string
          sent_at: string | null
          sent_to_email: string | null
          total_amount_cents: number
          total_sessions: number
        }
        Insert: {
          created_at?: string | null
          helper_id: string
          id?: string
          month_year: string
          pdf_url: string
          resident_id: string
          sent_at?: string | null
          sent_to_email?: string | null
          total_amount_cents: number
          total_sessions: number
        }
        Update: {
          created_at?: string | null
          helper_id?: string
          id?: string
          month_year?: string
          pdf_url?: string
          resident_id?: string
          sent_at?: string | null
          sent_to_email?: string | null
          total_amount_cents?: number
          total_sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "help_monthly_reports_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "neighborhood_helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      help_receipts: {
        Row: {
          created_at: string | null
          id: string
          pdf_url: string
          session_id: string
          submitted_at: string | null
          submitted_to_insurer: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pdf_url: string
          session_id: string
          submitted_at?: string | null
          submitted_to_insurer?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pdf_url?: string
          session_id?: string
          submitted_at?: string | null
          submitted_to_insurer?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "help_receipts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "help_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      help_requests: {
        Row: {
          category: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          quarter_id: string | null
          status: string
          subcategory: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          quarter_id?: string | null
          status?: string
          subcategory?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          quarter_id?: string | null
          status?: string
          subcategory?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "help_requests_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      help_responses: {
        Row: {
          created_at: string
          help_request_id: string
          id: string
          message: string
          responder_user_id: string
        }
        Insert: {
          created_at?: string
          help_request_id: string
          id?: string
          message: string
          responder_user_id: string
        }
        Update: {
          created_at?: string
          help_request_id?: string
          id?: string
          message?: string
          responder_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_responses_help_request_id_fkey"
            columns: ["help_request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_responses_responder_user_id_fkey"
            columns: ["responder_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      help_sessions: {
        Row: {
          activity_category: string
          activity_description: string | null
          created_at: string | null
          duration_minutes: number
          end_time: string
          helper_signature_url: string | null
          hourly_rate_cents: number
          id: string
          match_id: string
          resident_signature_url: string | null
          session_date: string
          start_time: string
          status: string | null
          total_amount_cents: number
        }
        Insert: {
          activity_category: string
          activity_description?: string | null
          created_at?: string | null
          duration_minutes: number
          end_time: string
          helper_signature_url?: string | null
          hourly_rate_cents: number
          id?: string
          match_id: string
          resident_signature_url?: string | null
          session_date: string
          start_time: string
          status?: string | null
          total_amount_cents: number
        }
        Update: {
          activity_category?: string
          activity_description?: string | null
          created_at?: string | null
          duration_minutes?: number
          end_time?: string
          helper_signature_url?: string | null
          hourly_rate_cents?: number
          id?: string
          match_id?: string
          resident_signature_url?: string | null
          session_date?: string
          start_time?: string
          status?: string | null
          total_amount_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "help_sessions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "help_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      helper_connections: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          helper_id: string
          id: string
          invite_code: string | null
          resident_id: string
          revoked_at: string | null
          source: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          helper_id: string
          id?: string
          invite_code?: string | null
          resident_id: string
          revoked_at?: string | null
          source: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          helper_id?: string
          id?: string
          invite_code?: string | null
          resident_id?: string
          revoked_at?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "helper_connections_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "neighborhood_helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          id: string
          role: string
          user_id: string
          verification_method: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          role?: string
          user_id: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          role?: string
          user_id?: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          city: string | null
          created_at: string
          house_number: string
          id: string
          invite_code: string
          lat: number
          lng: number
          map_house_id: string | null
          position_accuracy: string | null
          position_manual_override: boolean
          position_raw_payload: Json | null
          position_source: string | null
          position_verified: boolean
          position_verified_at: string | null
          postal_code: string | null
          quarter_id: string
          quiet_hours_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          street_name: string
          verified: boolean
        }
        Insert: {
          city?: string | null
          created_at?: string
          house_number: string
          id?: string
          invite_code: string
          lat: number
          lng: number
          map_house_id?: string | null
          position_accuracy?: string | null
          position_manual_override?: boolean
          position_raw_payload?: Json | null
          position_source?: string | null
          position_verified?: boolean
          position_verified_at?: string | null
          postal_code?: string | null
          quarter_id: string
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          street_name: string
          verified?: boolean
        }
        Update: {
          city?: string | null
          created_at?: string
          house_number?: string
          id?: string
          invite_code?: string
          lat?: number
          lng?: number
          map_house_id?: string | null
          position_accuracy?: string | null
          position_manual_override?: boolean
          position_raw_payload?: Json | null
          position_source?: string | null
          position_verified?: boolean
          position_verified_at?: string | null
          postal_code?: string | null
          quarter_id?: string
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          street_name?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "households_map_house_id_fkey"
            columns: ["map_house_id"]
            isOneToOne: false
            referencedRelation: "map_houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "households_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_configs: {
        Row: {
          id: string
          instructions: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          short_name: string
          submission_email: string | null
          submission_type: string
          submission_url: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          instructions: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          short_name: string
          submission_email?: string | null
          submission_type: string
          submission_url?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          instructions?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          short_name?: string
          submission_email?: string | null
          submission_type?: string
          submission_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          counterparty: string
          counterparty_address: string | null
          counterparty_tax_id: string | null
          created_at: string | null
          currency: string | null
          due_at: string | null
          e_invoice_xml: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          line_items: Json
          notes: string | null
          paid_at: string | null
          pdf_url: string | null
          status: string | null
          stripe_invoice_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          type: string
        }
        Insert: {
          counterparty: string
          counterparty_address?: string | null
          counterparty_tax_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_at?: string | null
          e_invoice_xml?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          type: string
        }
        Update: {
          counterparty?: string
          counterparty_address?: string | null
          counterparty_tax_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_at?: string | null
          e_invoice_xml?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          type?: string
        }
        Relationships: []
      }
      kiosk_photos: {
        Row: {
          caption: string | null
          created_at: string
          household_id: string
          id: string
          pinned: boolean
          storage_path: string
          uploaded_by: string
          visible: boolean
        }
        Insert: {
          caption?: string | null
          created_at?: string
          household_id: string
          id?: string
          pinned?: boolean
          storage_path: string
          uploaded_by: string
          visible?: boolean
        }
        Update: {
          caption?: string | null
          created_at?: string
          household_id?: string
          id?: string
          pinned?: boolean
          storage_path?: string
          uploaded_by?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_photos_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_reminders: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          household_id: string
          id: string
          scheduled_at: string | null
          title: string
          type: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          household_id: string
          id?: string
          scheduled_at?: string | null
          title: string
          type: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          household_id?: string
          id?: string
          scheduled_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_reminders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_reminders_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_targets: {
        Row: {
          created_at: string
          id: string
          metric_key: string
          period: string
          quarter_id: string
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_key: string
          period?: string
          quarter_id: string
          target_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_key?: string
          period?: string
          quarter_id?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_targets_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "kpi_targets_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      leihboerse_items: {
        Row: {
          available_until: string | null
          category: string
          created_at: string
          deposit: string | null
          description: string | null
          id: string
          image_url: string | null
          quarter_id: string | null
          reserved_by: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          available_until?: string | null
          category: string
          created_at?: string
          deposit?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          quarter_id?: string | null
          reserved_by?: string | null
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          available_until?: string | null
          category?: string
          created_at?: string
          deposit?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          quarter_id?: string | null
          reserved_by?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leihboerse_items_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "leihboerse_items_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leihboerse_items_reserved_by_fkey"
            columns: ["reserved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leihboerse_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          location_hint: string | null
          quarter_id: string | null
          resolved_at: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          location_hint?: string | null
          quarter_id?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          location_hint?: string | null
          quarter_id?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "lost_found_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      map_houses: {
        Row: {
          created_at: string
          default_color: string
          geo: unknown
          house_number: string
          household_id: string | null
          id: string
          lat: number | null
          lng: number | null
          quarter_id: string | null
          street_code: string
          updated_at: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          default_color?: string
          geo?: unknown
          house_number: string
          household_id?: string | null
          id: string
          lat?: number | null
          lng?: number | null
          quarter_id?: string | null
          street_code: string
          updated_at?: string
          x: number
          y: number
        }
        Update: {
          created_at?: string
          default_color?: string
          geo?: unknown
          house_number?: string
          household_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          quarter_id?: string | null
          street_code?: string
          updated_at?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "map_houses_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_houses_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "map_houses_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          price: number | null
          quarter_id: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          price?: number | null
          quarter_id?: string | null
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          price?: number | null
          quarter_id?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_items_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "marketplace_items_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_signups: {
        Row: {
          created_at: string | null
          id: string
          meal_id: string
          portions: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          meal_id: string
          portions?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          meal_id?: string
          portions?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_signups_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "shared_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_documents: {
        Row: {
          appointment_id: string | null
          category: string | null
          created_at: string | null
          doctor_id: string
          file_path: string
          file_size: number
          filename: string
          id: string
          mime_type: string
          patient_id: string
          uploader_id: string
        }
        Insert: {
          appointment_id?: string | null
          category?: string | null
          created_at?: string | null
          doctor_id: string
          file_path: string
          file_size: number
          filename: string
          id?: string
          mime_type: string
          patient_id: string
          uploader_id: string
        }
        Update: {
          appointment_id?: string | null
          category?: string | null
          created_at?: string | null
          doctor_id?: string
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          patient_id?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_documents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "consultation_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_message_threads: {
        Row: {
          created_at: string | null
          doctor_id: string
          id: string
          last_message_at: string | null
          patient_id: string
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          id?: string
          last_message_at?: string | null
          patient_id: string
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          id?: string
          last_message_at?: string | null
          patient_id?: string
          subject?: string | null
        }
        Relationships: []
      }
      medical_messages: {
        Row: {
          content_encrypted: string
          created_at: string | null
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          content_encrypted: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          thread_id: string
        }
        Update: {
          content_encrypted?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "medical_message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          appeal_status: string | null
          appeal_text: string | null
          created_at: string | null
          created_by: string | null
          duration: string | null
          expires_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          action: string
          appeal_status?: string | null
          appeal_text?: string | null
          created_at?: string | null
          created_by?: string | null
          duration?: string | null
          expires_at?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          action?: string
          appeal_status?: string | null
          appeal_text?: string | null
          created_at?: string | null
          created_by?: string | null
          duration?: string | null
          expires_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      moderation_config: {
        Row: {
          auto_ban_threshold: number | null
          auto_hide_threshold: number | null
          channel: string
          created_at: string | null
          id: string
          max_reports_per_hour: number | null
          red_action: string | null
          updated_at: string | null
          yellow_action: string | null
        }
        Insert: {
          auto_ban_threshold?: number | null
          auto_hide_threshold?: number | null
          channel: string
          created_at?: string | null
          id?: string
          max_reports_per_hour?: number | null
          red_action?: string | null
          updated_at?: string | null
          yellow_action?: string | null
        }
        Update: {
          auto_ban_threshold?: number | null
          auto_hide_threshold?: number | null
          channel?: string
          created_at?: string | null
          id?: string
          max_reports_per_hour?: number | null
          red_action?: string | null
          updated_at?: string | null
          yellow_action?: string | null
        }
        Relationships: []
      }
      moderation_queue: {
        Row: {
          ai_confidence: number | null
          ai_reason: string | null
          ai_score: string | null
          channel: string
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          weighted_report_score: number | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_reason?: string | null
          ai_score?: string | null
          channel: string
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          weighted_report_score?: number | null
        }
        Update: {
          ai_confidence?: number | null
          ai_reason?: string | null
          ai_score?: string | null
          channel?: string
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          weighted_report_score?: number | null
        }
        Relationships: []
      }
      monthly_summaries: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          id: string
          is_closed: boolean | null
          month: number
          net_profit_cents: number | null
          subscription_count: number | null
          total_expense_cents: number | null
          total_income_cents: number | null
          total_tax_collected_cents: number | null
          total_tax_paid_cents: number | null
          ust_voranmeldung_amount_cents: number | null
          video_credit_count: number | null
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          is_closed?: boolean | null
          month: number
          net_profit_cents?: number | null
          subscription_count?: number | null
          total_expense_cents?: number | null
          total_income_cents?: number | null
          total_tax_collected_cents?: number | null
          total_tax_paid_cents?: number | null
          ust_voranmeldung_amount_cents?: number | null
          video_credit_count?: number | null
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          is_closed?: boolean | null
          month?: number
          net_profit_cents?: number | null
          subscription_count?: number | null
          total_expense_cents?: number | null
          total_income_cents?: number | null
          total_tax_collected_cents?: number | null
          total_tax_paid_cents?: number | null
          ust_voranmeldung_amount_cents?: number | null
          video_credit_count?: number | null
          year?: number
        }
        Relationships: []
      }
      municipal_announcements: {
        Row: {
          amtsblatt_issue_id: string | null
          author_id: string | null
          body: string
          category: Database["public"]["Enums"]["announcement_category"] | null
          created_at: string | null
          event_date: string | null
          expires_at: string | null
          id: string
          pinned: boolean | null
          published_at: string | null
          quarter_id: string
          source_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amtsblatt_issue_id?: string | null
          author_id?: string | null
          body: string
          category?: Database["public"]["Enums"]["announcement_category"] | null
          created_at?: string | null
          event_date?: string | null
          expires_at?: string | null
          id?: string
          pinned?: boolean | null
          published_at?: string | null
          quarter_id: string
          source_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amtsblatt_issue_id?: string | null
          author_id?: string | null
          body?: string
          category?: Database["public"]["Enums"]["announcement_category"] | null
          created_at?: string | null
          event_date?: string | null
          expires_at?: string | null
          id?: string
          pinned?: boolean | null
          published_at?: string | null
          quarter_id?: string
          source_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "municipal_announcements_amtsblatt_issue_id_fkey"
            columns: ["amtsblatt_issue_id"]
            isOneToOne: false
            referencedRelation: "amtsblatt_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_announcements_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "municipal_announcements_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_config: {
        Row: {
          apotheken: Json | null
          city_name: string
          created_at: string | null
          events: Json | null
          events_calendar_url: string | null
          features: Json | null
          id: string
          notdienst_url: string | null
          oepnv_stops: Json | null
          opening_hours: Json | null
          quarter_id: string
          rathaus_email: string | null
          rathaus_phone: string | null
          rathaus_url: string | null
          service_links: Json | null
          state: string
          updated_at: string | null
          wiki_entries: Json | null
        }
        Insert: {
          apotheken?: Json | null
          city_name: string
          created_at?: string | null
          events?: Json | null
          events_calendar_url?: string | null
          features?: Json | null
          id?: string
          notdienst_url?: string | null
          oepnv_stops?: Json | null
          opening_hours?: Json | null
          quarter_id: string
          rathaus_email?: string | null
          rathaus_phone?: string | null
          rathaus_url?: string | null
          service_links?: Json | null
          state?: string
          updated_at?: string | null
          wiki_entries?: Json | null
        }
        Update: {
          apotheken?: Json | null
          city_name?: string
          created_at?: string | null
          events?: Json | null
          events_calendar_url?: string | null
          features?: Json | null
          id?: string
          notdienst_url?: string | null
          oepnv_stops?: Json | null
          opening_hours?: Json | null
          quarter_id?: string
          rathaus_email?: string | null
          rathaus_phone?: string | null
          rathaus_url?: string | null
          service_links?: Json | null
          state?: string
          updated_at?: string | null
          wiki_entries?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "municipal_config_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: true
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "municipal_config_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: true
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_report_comments: {
        Row: {
          created_at: string | null
          id: string
          report_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          report_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipal_report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "municipal_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_reports: {
        Row: {
          category: Database["public"]["Enums"]["report_category"]
          created_at: string | null
          description: string | null
          id: string
          location: unknown
          location_text: string | null
          photo_url: string | null
          quarter_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          status_note: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["report_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          location?: unknown
          location_text?: string | null
          photo_url?: string | null
          quarter_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          status_note?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["report_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          location?: unknown
          location_text?: string | null
          photo_url?: string | null
          quarter_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          status_note?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipal_reports_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "municipal_reports_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      neighbor_connections: {
        Row: {
          created_at: string
          id: string
          message: string | null
          requester_id: string
          responded_at: string | null
          status: string
          target_household_id: string | null
          target_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          requester_id: string
          responded_at?: string | null
          status?: string
          target_household_id?: string | null
          target_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          requester_id?: string
          responded_at?: string | null
          status?: string
          target_household_id?: string | null
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighbor_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neighbor_connections_target_household_id_fkey"
            columns: ["target_household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neighbor_connections_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      neighbor_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          converted_at: string | null
          converted_user_id: string | null
          created_at: string
          expires_at: string | null
          household_id: string
          id: string
          invite_code: string
          invite_method: string
          invite_target: string | null
          inviter_id: string
          quarter_id: string | null
          recipient_name: string | null
          recipient_phone: string | null
          sms_sent: boolean | null
          sms_sid: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          converted_at?: string | null
          converted_user_id?: string | null
          created_at?: string
          expires_at?: string | null
          household_id: string
          id?: string
          invite_code: string
          invite_method: string
          invite_target?: string | null
          inviter_id: string
          quarter_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sms_sent?: boolean | null
          sms_sid?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          converted_at?: string | null
          converted_user_id?: string | null
          created_at?: string
          expires_at?: string | null
          household_id?: string
          id?: string
          invite_code?: string
          invite_method?: string
          invite_target?: string | null
          inviter_id?: string
          quarter_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sms_sent?: boolean | null
          sms_sid?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighbor_invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neighbor_invitations_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "neighbor_invitations_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhood_helpers: {
        Row: {
          active_client_count: number | null
          certification_url: string | null
          created_at: string | null
          date_of_birth: string
          federal_state: string
          hourly_rate_cents: number
          household_check: boolean
          id: string
          relationship_check: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancelled_at: string | null
          subscription_paused_at: string | null
          subscription_status: string | null
          terms_accepted_at: string | null
          trial_receipt_used: boolean | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          active_client_count?: number | null
          certification_url?: string | null
          created_at?: string | null
          date_of_birth: string
          federal_state: string
          hourly_rate_cents: number
          household_check?: boolean
          id?: string
          relationship_check?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancelled_at?: string | null
          subscription_paused_at?: string | null
          subscription_status?: string | null
          terms_accepted_at?: string | null
          trial_receipt_used?: boolean | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          active_client_count?: number | null
          certification_url?: string | null
          created_at?: string | null
          date_of_birth?: string
          federal_state?: string
          hourly_rate_cents?: number
          household_check?: boolean
          id?: string
          relationship_check?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancelled_at?: string | null
          subscription_paused_at?: string | null
          subscription_status?: string | null
          terms_accepted_at?: string | null
          trial_receipt_used?: boolean | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "neighborhood_helpers_federal_state_fkey"
            columns: ["federal_state"]
            isOneToOne: false
            referencedRelation: "federal_state_rules"
            referencedColumns: ["state_code"]
          },
        ]
      }
      news_items: {
        Row: {
          ai_summary: string
          category: string
          created_at: string
          id: string
          original_title: string
          published_at: string | null
          quarter_id: string | null
          relevance_score: number
          source_url: string | null
        }
        Insert: {
          ai_summary: string
          category: string
          created_at?: string
          id?: string
          original_title: string
          published_at?: string | null
          quarter_id?: string | null
          relevance_score?: number
          source_url?: string | null
        }
        Update: {
          ai_summary?: string
          category?: string
          created_at?: string
          id?: string
          original_title?: string
          published_at?: string | null
          quarter_id?: string | null
          relevance_score?: number
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_items_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "news_items_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      nina_warnings: {
        Row: {
          ags: string
          created_at: string
          description: string | null
          expires_at: string | null
          headline: string
          id: string
          push_sent: boolean
          sent_at: string
          severity: string
          warning_id: string
        }
        Insert: {
          ags: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          headline: string
          id?: string
          push_sent?: boolean
          sent_at: string
          severity: string
          warning_id: string
        }
        Update: {
          ags?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          headline?: string
          id?: string
          push_sent?: boolean
          sent_at?: string
          severity?: string
          warning_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_steps: {
        Row: {
          id: string
          sent_at: string
          step: string
          user_id: string
        }
        Insert: {
          id?: string
          sent_at?: string
          step: string
          user_id: string
        }
        Update: {
          id?: string
          sent_at?: string
          step?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          org_id: string
          prev_hash: string | null
          target_user_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          org_id: string
          prev_hash?: string | null
          target_user_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          org_id?: string
          prev_hash?: string | null
          target_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          assigned_quarters: string[] | null
          created_at: string | null
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_member_role"] | null
          user_id: string
        }
        Insert: {
          assigned_quarters?: string[] | null
          created_at?: string | null
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_member_role"] | null
          user_id: string
        }
        Update: {
          assigned_quarters?: string[] | null
          created_at?: string | null
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_member_role"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_neighbors: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          distance_km: number | null
          id: string
          org_a_id: string
          org_b_id: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          distance_km?: number | null
          id?: string
          org_a_id: string
          org_b_id: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          distance_km?: number | null
          id?: string
          org_a_id?: string
          org_b_id?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_neighbors_org_a_id_fkey"
            columns: ["org_a_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_neighbors_org_b_id_fkey"
            columns: ["org_b_id"]
            isOneToOne: false
            referencedRelation: "civic_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          avv_signed_at: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string | null
          hr_vr_number: string | null
          id: string
          name: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string | null
          verification_status:
            | Database["public"]["Enums"]["org_verification_status"]
            | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          avv_signed_at?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string | null
          hr_vr_number?: string | null
          id?: string
          name: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["org_verification_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          avv_signed_at?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string | null
          hr_vr_number?: string | null
          id?: string
          name?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["org_verification_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      paketannahme: {
        Row: {
          available_date: string
          available_from: string | null
          available_until: string | null
          created_at: string
          id: string
          note: string | null
          quarter_id: string | null
          user_id: string
        }
        Insert: {
          available_date?: string
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          id?: string
          note?: string | null
          quarter_id?: string | null
          user_id: string
        }
        Update: {
          available_date?: string
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          id?: string
          note?: string | null
          quarter_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paketannahme_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "paketannahme_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paketannahme_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      passkey_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      passkey_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      pflege_resident_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          org_id: string
          resident_id: string
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          org_id: string
          resident_id: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          org_id?: string
          resident_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pflege_resident_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pflegegrad_assessments: {
        Row: {
          assessor_id: string
          assessor_role: string
          created_at: string
          estimated_grade: number | null
          id: string
          module_scores: Json
          notes: string | null
          total_raw: number
          total_weighted: number
          user_id: string
        }
        Insert: {
          assessor_id: string
          assessor_role: string
          created_at?: string
          estimated_grade?: number | null
          id?: string
          module_scores: Json
          notes?: string | null
          total_raw: number
          total_weighted: number
          user_id: string
        }
        Update: {
          assessor_id?: string
          assessor_role?: string
          created_at?: string
          estimated_grade?: number | null
          id?: string
          module_scores?: Json
          notes?: string | null
          total_raw?: number
          total_weighted?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pflegegrad_assessments_assessor_id_fkey"
            columns: ["assessor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pflegegrad_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plus_trial_grants: {
        Row: {
          caregiver_user_id: string
          converted_at: string | null
          converted_to_paid: boolean | null
          enrollment_id: string
          expires_at: string
          granted_at: string
          id: string
          months_granted: number
          tier: string
        }
        Insert: {
          caregiver_user_id: string
          converted_at?: string | null
          converted_to_paid?: boolean | null
          enrollment_id: string
          expires_at: string
          granted_at?: string
          id?: string
          months_granted: number
          tier: string
        }
        Update: {
          caregiver_user_id?: string
          converted_at?: string | null
          converted_to_paid?: boolean | null
          enrollment_id?: string
          expires_at?: string
          granted_at?: string
          id?: string
          months_granted?: number
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "plus_trial_grants_caregiver_user_id_fkey"
            columns: ["caregiver_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plus_trial_grants_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "prevention_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      points_log: {
        Row: {
          action: string
          created_at: string
          id: string
          points: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          points: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          label: string
          poll_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          label: string
          poll_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          label?: string
          poll_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          closes_at: string | null
          created_at: string
          id: string
          multiple_choice: boolean
          quarter_id: string | null
          question: string
          status: string
          user_id: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          id?: string
          multiple_choice?: boolean
          quarter_id?: string | null
          question: string
          status?: string
          user_id: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          id?: string
          multiple_choice?: boolean
          quarter_id?: string | null
          question?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "polls_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_announcements: {
        Row: {
          content: string
          created_at: string
          doctor_id: string
          expires_at: string | null
          id: string
          published_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          doctor_id: string
          expires_at?: string | null
          id?: string
          published_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          doctor_id?: string
          expires_at?: string | null
          id?: string
          published_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      practice_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          practice_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          practice_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          practice_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_invitations_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_members: {
        Row: {
          doctor_id: string
          id: string
          joined_at: string
          practice_id: string
          role: string
        }
        Insert: {
          doctor_id: string
          id?: string
          joined_at?: string
          practice_id: string
          role?: string
        }
        Update: {
          doctor_id?: string
          id?: string
          joined_at?: string
          practice_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_members_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practices: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
        }
        Relationships: []
      }
      prescription_reminders: {
        Row: {
          channel: string
          created_at: string
          id: string
          prescription_id: string
          reminder_date: string
          sent_at: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          prescription_id: string
          reminder_date: string
          sent_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          prescription_id?: string
          reminder_date?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_reminders_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_requests: {
        Row: {
          created_at: string | null
          doctor_id: string
          dosage: string | null
          id: string
          medication_name: string
          notes: string | null
          patient_id: string
          responded_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          dosage?: string | null
          id?: string
          medication_name: string
          notes?: string | null
          patient_id: string
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          dosage?: string | null
          id?: string
          medication_name?: string
          notes?: string | null
          patient_id?: string
          responded_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          created_at: string
          doctor_email: string | null
          doctor_fax: string | null
          doctor_name: string
          id: string
          notes: string | null
          org_id: string
          renewal_requested_at: string | null
          resident_id: string
          status: string
          type: string
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          doctor_email?: string | null
          doctor_fax?: string | null
          doctor_name: string
          id?: string
          notes?: string | null
          org_id: string
          renewal_requested_at?: string | null
          resident_id: string
          status?: string
          type: string
          updated_at?: string
          valid_from: string
          valid_until: string
        }
        Update: {
          created_at?: string
          doctor_email?: string | null
          doctor_fax?: string | null
          doctor_name?: string
          id?: string
          notes?: string | null
          org_id?: string
          renewal_requested_at?: string | null
          resident_id?: string
          status?: string
          type?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prevention_course_content: {
        Row: {
          course_id: string
          description: string | null
          id: string
          ki_system_prompt: string | null
          materials_url: string | null
          methods: string[] | null
          prompt_version: number
          title: string
          updated_at: string
          updated_by: string | null
          week_number: number
        }
        Insert: {
          course_id: string
          description?: string | null
          id?: string
          ki_system_prompt?: string | null
          materials_url?: string | null
          methods?: string[] | null
          prompt_version?: number
          title: string
          updated_at?: string
          updated_by?: string | null
          week_number: number
        }
        Update: {
          course_id?: string
          description?: string | null
          id?: string
          ki_system_prompt?: string | null
          materials_url?: string | null
          methods?: string[] | null
          prompt_version?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "prevention_course_content_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "prevention_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_course_content_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prevention_courses: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string
          id: string
          instructor_id: string
          max_participants: number | null
          quarter_id: string | null
          starts_at: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          instructor_id: string
          max_participants?: number | null
          quarter_id?: string | null
          starts_at: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          instructor_id?: string
          max_participants?: number | null
          quarter_id?: string | null
          starts_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "prevention_courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_courses_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "prevention_courses_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      prevention_enrollments: {
        Row: {
          attendance_rate: number | null
          certificate_generated: boolean | null
          certificate_id: string | null
          certificate_issued_at: string | null
          certificate_issued_by: string | null
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          insurance_config_id: string | null
          insurance_provider: string | null
          payer_email: string | null
          payer_name: string | null
          payer_type: string | null
          payer_user_id: string | null
          post_pss10_completed_at: string | null
          post_pss10_score: number | null
          pre_pss10_completed_at: string | null
          pre_pss10_score: number | null
          pss10_version: string | null
          reimbursement_confirmed_at: string | null
          reimbursement_method: string | null
          reimbursement_reminder_enabled: boolean | null
          reimbursement_started_at: string | null
          reimbursement_submitted_at: string | null
          reward_tier: string | null
          user_id: string
        }
        Insert: {
          attendance_rate?: number | null
          certificate_generated?: boolean | null
          certificate_id?: string | null
          certificate_issued_at?: string | null
          certificate_issued_by?: string | null
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          insurance_config_id?: string | null
          insurance_provider?: string | null
          payer_email?: string | null
          payer_name?: string | null
          payer_type?: string | null
          payer_user_id?: string | null
          post_pss10_completed_at?: string | null
          post_pss10_score?: number | null
          pre_pss10_completed_at?: string | null
          pre_pss10_score?: number | null
          pss10_version?: string | null
          reimbursement_confirmed_at?: string | null
          reimbursement_method?: string | null
          reimbursement_reminder_enabled?: boolean | null
          reimbursement_started_at?: string | null
          reimbursement_submitted_at?: string | null
          reward_tier?: string | null
          user_id: string
        }
        Update: {
          attendance_rate?: number | null
          certificate_generated?: boolean | null
          certificate_id?: string | null
          certificate_issued_at?: string | null
          certificate_issued_by?: string | null
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          insurance_config_id?: string | null
          insurance_provider?: string | null
          payer_email?: string | null
          payer_name?: string | null
          payer_type?: string | null
          payer_user_id?: string | null
          post_pss10_completed_at?: string | null
          post_pss10_score?: number | null
          pre_pss10_completed_at?: string | null
          pre_pss10_score?: number | null
          pss10_version?: string | null
          reimbursement_confirmed_at?: string | null
          reimbursement_method?: string | null
          reimbursement_reminder_enabled?: boolean | null
          reimbursement_started_at?: string | null
          reimbursement_submitted_at?: string | null
          reward_tier?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prevention_enrollments_certificate_issued_by_fkey"
            columns: ["certificate_issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "prevention_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_enrollments_insurance_config_id_fkey"
            columns: ["insurance_config_id"]
            isOneToOne: false
            referencedRelation: "insurance_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_enrollments_payer_user_id_fkey"
            columns: ["payer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prevention_group_calls: {
        Row: {
          course_id: string
          duration_minutes: number | null
          id: string
          instructor_id: string
          meeting_url: string | null
          recording_consent: boolean | null
          scheduled_at: string
          week_number: number
        }
        Insert: {
          course_id: string
          duration_minutes?: number | null
          id?: string
          instructor_id: string
          meeting_url?: string | null
          recording_consent?: boolean | null
          scheduled_at: string
          week_number: number
        }
        Update: {
          course_id?: string
          duration_minutes?: number | null
          id?: string
          instructor_id?: string
          meeting_url?: string | null
          recording_consent?: boolean | null
          scheduled_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "prevention_group_calls_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "prevention_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_group_calls_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prevention_messages: {
        Row: {
          body: string
          course_id: string
          created_at: string
          id: string
          message_type: string
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          subject: string | null
        }
        Insert: {
          body: string
          course_id: string
          created_at?: string
          id?: string
          message_type: string
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          subject?: string | null
        }
        Update: {
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prevention_messages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "prevention_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prevention_payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string | null
          enrollment_id: string
          id: string
          insurance_amount_cents: number | null
          insurance_name: string | null
          insurance_reimbursed: boolean | null
          insurance_reimbursed_at: string | null
          invoice_number: string | null
          payer_user_id: string | null
          payment_method: string | null
          payment_type: string
          status: string
          stripe_payment_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string | null
          enrollment_id: string
          id?: string
          insurance_amount_cents?: number | null
          insurance_name?: string | null
          insurance_reimbursed?: boolean | null
          insurance_reimbursed_at?: string | null
          invoice_number?: string | null
          payer_user_id?: string | null
          payment_method?: string | null
          payment_type: string
          status?: string
          stripe_payment_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string | null
          enrollment_id?: string
          id?: string
          insurance_amount_cents?: number | null
          insurance_name?: string | null
          insurance_reimbursed?: boolean | null
          insurance_reimbursed_at?: string | null
          invoice_number?: string | null
          payer_user_id?: string | null
          payment_method?: string | null
          payment_type?: string
          status?: string
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prevention_payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "prevention_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_payments_payer_user_id_fkey"
            columns: ["payer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prevention_reviews: {
        Row: {
          created_at: string
          enrollment_id: string
          id: string
          rating: number
          text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          id?: string
          rating: number
          text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          id?: string
          rating?: number
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prevention_reviews_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "prevention_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prevention_sessions: {
        Row: {
          attendance_verified: boolean | null
          completed_at: string | null
          day_of_week: number | null
          duration_seconds: number | null
          enrollment_id: string
          escalation_flag: string | null
          id: string
          instructor_duration_seconds: number | null
          instructor_present: boolean | null
          mood_after: number | null
          mood_before: number | null
          notes_encrypted: string | null
          session_type: string
          started_at: string
          voice_consent_given: boolean | null
          week_number: number
        }
        Insert: {
          attendance_verified?: boolean | null
          completed_at?: string | null
          day_of_week?: number | null
          duration_seconds?: number | null
          enrollment_id: string
          escalation_flag?: string | null
          id?: string
          instructor_duration_seconds?: number | null
          instructor_present?: boolean | null
          mood_after?: number | null
          mood_before?: number | null
          notes_encrypted?: string | null
          session_type: string
          started_at?: string
          voice_consent_given?: boolean | null
          week_number: number
        }
        Update: {
          attendance_verified?: boolean | null
          completed_at?: string | null
          day_of_week?: number | null
          duration_seconds?: number | null
          enrollment_id?: string
          escalation_flag?: string | null
          id?: string
          instructor_duration_seconds?: number | null
          instructor_present?: boolean | null
          mood_after?: number | null
          mood_before?: number | null
          notes_encrypted?: string | null
          session_type?: string
          started_at?: string
          voice_consent_given?: boolean | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "prevention_sessions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "prevention_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      prevention_visibility_consent: {
        Row: {
          enrollment_id: string
          granted_at: string
          id: string
          revoked_at: string | null
          user_id: string
          viewer_type: string
        }
        Insert: {
          enrollment_id: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          user_id: string
          viewer_type: string
        }
        Update: {
          enrollment_id?: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          user_id?: string
          viewer_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prevention_visibility_consent_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "prevention_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_visibility_consent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          last_used_at: string | null
          p256dh: string
          portal: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          portal?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          portal?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quarter_admins: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          quarter_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          quarter_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          quarter_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarter_admins_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarter_admins_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "quarter_admins_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarter_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quarters: {
        Row: {
          activated_at: string | null
          bbk_ars: string | null
          boundary: unknown
          bounds_ne_lat: number
          bounds_ne_lng: number
          bounds_sw_lat: number
          bounds_sw_lng: number
          bw_ars: string | null
          center_lat: number
          center_lng: number
          city: string | null
          contact_email: string | null
          country: string | null
          created_at: string
          created_by: string | null
          description: string | null
          geo_boundary: unknown
          geo_center: unknown
          household_count: number | null
          id: string
          invite_prefix: string | null
          map_config: Json | null
          max_households: number | null
          name: string
          postal_code: string | null
          settings: Json | null
          slug: string
          state: string | null
          status: string
          updated_at: string
          waste_area_id: string | null
          weekly_active_pct: number | null
          zoom_level: number
        }
        Insert: {
          activated_at?: string | null
          bbk_ars?: string | null
          boundary?: unknown
          bounds_ne_lat: number
          bounds_ne_lng: number
          bounds_sw_lat: number
          bounds_sw_lng: number
          bw_ars?: string | null
          center_lat: number
          center_lng: number
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          geo_boundary?: unknown
          geo_center?: unknown
          household_count?: number | null
          id?: string
          invite_prefix?: string | null
          map_config?: Json | null
          max_households?: number | null
          name: string
          postal_code?: string | null
          settings?: Json | null
          slug: string
          state?: string | null
          status?: string
          updated_at?: string
          waste_area_id?: string | null
          weekly_active_pct?: number | null
          zoom_level?: number
        }
        Update: {
          activated_at?: string | null
          bbk_ars?: string | null
          boundary?: unknown
          bounds_ne_lat?: number
          bounds_ne_lng?: number
          bounds_sw_lat?: number
          bounds_sw_lng?: number
          bw_ars?: string | null
          center_lat?: number
          center_lng?: number
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          geo_boundary?: unknown
          geo_center?: unknown
          household_count?: number | null
          id?: string
          invite_prefix?: string | null
          map_config?: Json | null
          max_households?: number | null
          name?: string
          postal_code?: string | null
          settings?: Json | null
          slug?: string
          state?: string | null
          status?: string
          updated_at?: string
          waste_area_id?: string | null
          weekly_active_pct?: number | null
          zoom_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "quarters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarters_waste_area_id_fkey"
            columns: ["waste_area_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["area_id"]
          },
          {
            foreignKeyName: "quarters_waste_area_id_fkey"
            columns: ["waste_area_id"]
            isOneToOne: false
            referencedRelation: "waste_collection_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      quartier_info_cache: {
        Row: {
          data: Json
          expires_at: string
          fetched_at: string
          id: string
          quarter_id: string
          source: string
        }
        Insert: {
          data?: Json
          expires_at: string
          fetched_at?: string
          id?: string
          quarter_id: string
          source: string
        }
        Update: {
          data?: Json
          expires_at?: string
          fetched_at?: string
          id?: string
          quarter_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "quartier_info_cache_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "quartier_info_cache_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_reminders: {
        Row: {
          created_at: string | null
          doctor_id: string
          due_date: string
          id: string
          patient_id: string
          sent_at: string | null
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          due_date: string
          id?: string
          patient_id: string
          sent_at?: string | null
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          due_date?: string
          id?: string
          patient_id?: string
          sent_at?: string | null
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      reputation_points: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      retention_policies: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_cleanup_at: string | null
          legal_basis: string
          retention_days: number
          rows_deleted_last: number | null
          table_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_cleanup_at?: string | null
          legal_basis: string
          retention_days: number
          rows_deleted_last?: number | null
          table_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_cleanup_at?: string | null
          legal_basis?: string
          retention_days?: number
          rows_deleted_last?: number | null
          table_name?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          effective_score: number | null
          id: string
          ip_hash: string
          metadata: Json | null
          points: number
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          route_pattern: string | null
          session_hash: string | null
          severity: string
          stage: number | null
          trap_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          effective_score?: number | null
          id?: string
          ip_hash: string
          metadata?: Json | null
          points: number
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          route_pattern?: string | null
          session_hash?: string | null
          severity: string
          stage?: number | null
          trap_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          effective_score?: number | null
          id?: string
          ip_hash?: string
          metadata?: Json | null
          points?: number
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          route_pattern?: string | null
          session_hash?: string | null
          severity?: string
          stage?: number | null
          trap_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      security_forensics: {
        Row: {
          created_at: string
          event_id: string | null
          expires_at: string
          id: string
          ip_encrypted: string
          request_method: string
          request_url_encrypted: string | null
          response_status: number | null
          trap_type: string
          user_agent_encrypted: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          expires_at?: string
          id?: string
          ip_encrypted: string
          request_method?: string
          request_url_encrypted?: string | null
          response_status?: number | null
          trap_type: string
          user_agent_encrypted?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          expires_at?: string
          id?: string
          ip_encrypted?: string
          request_method?: string
          request_url_encrypted?: string | null
          response_status?: number | null
          trap_type?: string
          user_agent_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_forensics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "security_events"
            referencedColumns: ["id"]
          },
        ]
      }
      senior_checkins: {
        Row: {
          checked_in_at: string
          contact_person_name: string | null
          contact_person_phone: string | null
          id: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          contact_person_name?: string | null
          contact_person_phone?: string | null
          id?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string
          contact_person_name?: string | null
          contact_person_phone?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "senior_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_meals: {
        Row: {
          cost_hint: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          meal_date: string
          meal_time: string | null
          pickup_info: string | null
          quarter_id: string | null
          servings: number
          status: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          cost_hint?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          meal_date: string
          meal_time?: string | null
          pickup_info?: string | null
          quarter_id?: string | null
          servings: number
          status?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          cost_hint?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          meal_date?: string
          meal_time?: string | null
          pickup_info?: string | null
          quarter_id?: string | null
          servings?: number
          status?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_meals_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "shared_meals_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          quarter_id: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          quarter_id?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          quarter_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "skills_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      team_channels: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          quarter_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
          quarter_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          quarter_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_channels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          channel_id: string
          content_encrypted: string
          created_at: string
          expires_at: string
          id: string
          media_url: string | null
          mentions: string[] | null
          sender_id: string
        }
        Insert: {
          channel_id: string
          content_encrypted: string
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string | null
          mentions?: string[] | null
          sender_id: string
        }
        Update: {
          channel_id?: string
          content_encrypted?: string
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string | null
          mentions?: string[] | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "team_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_read_receipts: {
        Row: {
          channel_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_read_receipts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "team_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_read_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_incidents: {
        Row: {
          admin_id: string | null
          affected_services: string[] | null
          created_at: string | null
          description: string | null
          id: string
          postmortem: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          admin_id?: string | null
          affected_services?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          postmortem?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
        }
        Update: {
          admin_id?: string | null
          affected_services?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          postmortem?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      test_results: {
        Row: {
          comment: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          issue_type: string | null
          screenshot_url: string | null
          session_id: string
          severity: string | null
          status: string
          test_point_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          issue_type?: string | null
          screenshot_url?: string | null
          session_id: string
          severity?: string | null
          status?: string
          test_point_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          issue_type?: string | null
          screenshot_url?: string | null
          session_id?: string
          severity?: string | null
          status?: string
          test_point_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sessions: {
        Row: {
          app_version: string | null
          browser_info: string | null
          completed_at: string | null
          confidence_rating: number | null
          created_at: string
          device_type: string | null
          final_feedback: string | null
          id: string
          started_at: string
          started_from_route: string | null
          status: string
          summary: Json | null
          test_run_label: string | null
          usability_rating: number | null
          user_id: string
          visited_routes: Json | null
        }
        Insert: {
          app_version?: string | null
          browser_info?: string | null
          completed_at?: string | null
          confidence_rating?: number | null
          created_at?: string
          device_type?: string | null
          final_feedback?: string | null
          id?: string
          started_at?: string
          started_from_route?: string | null
          status?: string
          summary?: Json | null
          test_run_label?: string | null
          usability_rating?: number | null
          user_id: string
          visited_routes?: Json | null
        }
        Update: {
          app_version?: string | null
          browser_info?: string | null
          completed_at?: string | null
          confidence_rating?: number | null
          created_at?: string
          device_type?: string | null
          final_feedback?: string | null
          id?: string
          started_at?: string
          started_from_route?: string | null
          status?: string
          summary?: Json | null
          test_run_label?: string | null
          usability_rating?: number | null
          user_id?: string
          visited_routes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "test_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tip_confirmations: {
        Row: {
          created_at: string
          id: string
          tip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tip_confirmations_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tip_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tip_reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          text: string | null
          tip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          text?: string | null
          tip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          text?: string | null
          tip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tip_reviews_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_key: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          block_level: string | null
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          block_level?: string | null
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          block_level?: string | null
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_version_id: string
          granted_at: string
          id: string
          ip_address: unknown
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          consent_version_id: string
          granted_at?: string
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          consent_version_id?: string
          granted_at?: string
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_consent_version_id_fkey"
            columns: ["consent_version_id"]
            isOneToOne: false
            referencedRelation: "consent_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memory_audit_log: {
        Row: {
          action: Database["public"]["Enums"]["memory_audit_action"]
          actor_role: Database["public"]["Enums"]["memory_actor_role"]
          actor_user_id: string
          created_at: string
          fact_id: string | null
          id: string
          metadata: Json | null
          target_user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["memory_audit_action"]
          actor_role: Database["public"]["Enums"]["memory_actor_role"]
          actor_user_id: string
          created_at?: string
          fact_id?: string | null
          id?: string
          metadata?: Json | null
          target_user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["memory_audit_action"]
          actor_role?: Database["public"]["Enums"]["memory_actor_role"]
          actor_user_id?: string
          created_at?: string
          fact_id?: string | null
          id?: string
          metadata?: Json | null
          target_user_id?: string
        }
        Relationships: []
      }
      user_memory_consents: {
        Row: {
          consent_type: Database["public"]["Enums"]["memory_consent_type"]
          granted: boolean
          granted_at: string | null
          granted_by: string | null
          id: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          consent_type: Database["public"]["Enums"]["memory_consent_type"]
          granted?: boolean
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          consent_type?: Database["public"]["Enums"]["memory_consent_type"]
          granted?: boolean
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_memory_facts: {
        Row: {
          category: Database["public"]["Enums"]["memory_category"]
          confidence: number | null
          confirmed: boolean
          consent_level: Database["public"]["Enums"]["memory_consent_level"]
          created_at: string
          id: string
          key: string
          org_id: string | null
          source: Database["public"]["Enums"]["memory_source"]
          source_user_id: string | null
          updated_at: string
          user_id: string
          value: string
          value_encrypted: boolean
          visibility: Database["public"]["Enums"]["memory_visibility"]
        }
        Insert: {
          category: Database["public"]["Enums"]["memory_category"]
          confidence?: number | null
          confirmed?: boolean
          consent_level: Database["public"]["Enums"]["memory_consent_level"]
          created_at?: string
          id?: string
          key: string
          org_id?: string | null
          source: Database["public"]["Enums"]["memory_source"]
          source_user_id?: string | null
          updated_at?: string
          user_id: string
          value: string
          value_encrypted?: boolean
          visibility?: Database["public"]["Enums"]["memory_visibility"]
        }
        Update: {
          category?: Database["public"]["Enums"]["memory_category"]
          confidence?: number | null
          confirmed?: boolean
          consent_level?: Database["public"]["Enums"]["memory_consent_level"]
          created_at?: string
          id?: string
          key?: string
          org_id?: string | null
          source?: Database["public"]["Enums"]["memory_source"]
          source_user_id?: string | null
          updated_at?: string
          user_id?: string
          value?: string
          value_encrypted?: boolean
          visibility?: Database["public"]["Enums"]["memory_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "user_memory_facts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          bsnr: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          doctor_verification_status: string | null
          doctor_verified_at: string | null
          email_hash: string
          fachrichtung: string | null
          id: string
          is_admin: boolean
          is_tester: boolean | null
          lanr: string | null
          last_seen: string | null
          onboarding_completed: boolean | null
          passkey_challenge: string | null
          passkey_challenge_expires_at: string | null
          passkey_secret: string | null
          phone: string | null
          points_level: number
          praxis_address: string | null
          praxis_name: string | null
          praxis_website: string | null
          registered_by: string | null
          registered_by_role: string | null
          retention_until: string | null
          role: string
          settings: Json | null
          share_location_on_alert: boolean | null
          total_points: number
          trust_level: string
          ui_mode: string
          verification_notes: string | null
          verified_by: string | null
          voice_preferences: Json | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          bsnr?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          doctor_verification_status?: string | null
          doctor_verified_at?: string | null
          email_hash: string
          fachrichtung?: string | null
          id?: string
          is_admin?: boolean
          is_tester?: boolean | null
          lanr?: string | null
          last_seen?: string | null
          onboarding_completed?: boolean | null
          passkey_challenge?: string | null
          passkey_challenge_expires_at?: string | null
          passkey_secret?: string | null
          phone?: string | null
          points_level?: number
          praxis_address?: string | null
          praxis_name?: string | null
          praxis_website?: string | null
          registered_by?: string | null
          registered_by_role?: string | null
          retention_until?: string | null
          role?: string
          settings?: Json | null
          share_location_on_alert?: boolean | null
          total_points?: number
          trust_level?: string
          ui_mode?: string
          verification_notes?: string | null
          verified_by?: string | null
          voice_preferences?: Json | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          bsnr?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          doctor_verification_status?: string | null
          doctor_verified_at?: string | null
          email_hash?: string
          fachrichtung?: string | null
          id?: string
          is_admin?: boolean
          is_tester?: boolean | null
          lanr?: string | null
          last_seen?: string | null
          onboarding_completed?: boolean | null
          passkey_challenge?: string | null
          passkey_challenge_expires_at?: string | null
          passkey_secret?: string | null
          phone?: string | null
          points_level?: number
          praxis_address?: string | null
          praxis_name?: string | null
          praxis_website?: string | null
          registered_by?: string | null
          registered_by_role?: string | null
          retention_until?: string | null
          role?: string
          settings?: Json | null
          share_location_on_alert?: boolean | null
          total_points?: number
          trust_level?: string
          ui_mode?: string
          verification_notes?: string | null
          verified_by?: string | null
          voice_preferences?: Json | null
        }
        Relationships: []
      }
      vacation_modes: {
        Row: {
          created_at: string
          end_date: string
          id: string
          note: string | null
          notify_neighbors: boolean
          quarter_id: string | null
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          note?: string | null
          notify_neighbors?: boolean
          quarter_id?: string | null
          start_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          note?: string | null
          notify_neighbors?: boolean
          quarter_id?: string | null
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_modes_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "vacation_modes_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_modes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          household_id: string
          id: string
          method: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          household_id: string
          id?: string
          method?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          household_id?: string
          id?: string
          method?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      video_calls: {
        Row: {
          callee_id: string
          caller_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string | null
          status: string
          type: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          type?: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      video_credit_usage: {
        Row: {
          appointment_id: string | null
          credit_id: string
          id: string
          used_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          credit_id: string
          id?: string
          used_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          credit_id?: string
          id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_credit_usage_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "video_credits"
            referencedColumns: ["id"]
          },
        ]
      }
      video_credits: {
        Row: {
          credits_total: number
          credits_used: number | null
          doctor_id: string
          expires_at: string | null
          id: string
          purchased_at: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          credits_total: number
          credits_used?: number | null
          doctor_id: string
          expires_at?: string | null
          id?: string
          purchased_at?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          credits_total?: number
          credits_used?: number | null
          doctor_id?: string
          expires_at?: string | null
          id?: string
          purchased_at?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: []
      }
      waiting_room: {
        Row: {
          appointment_id: string | null
          called_at: string | null
          checked_in_at: string | null
          created_at: string | null
          doctor_id: string
          id: string
          patient_id: string
          position: number
          status: string | null
        }
        Insert: {
          appointment_id?: string | null
          called_at?: string | null
          checked_in_at?: string | null
          created_at?: string | null
          doctor_id: string
          id?: string
          patient_id: string
          position: number
          status?: string | null
        }
        Update: {
          appointment_id?: string | null
          called_at?: string | null
          checked_in_at?: string | null
          created_at?: string | null
          doctor_id?: string
          id?: string
          patient_id?: string
          position?: number
          status?: string | null
        }
        Relationships: []
      }
      warning_cache: {
        Row: {
          description: string | null
          expires: string | null
          external_id: string
          fetched_at: string
          id: string
          instructions: string | null
          onset: string | null
          quarter_id: string | null
          severity: string
          source: string
          title: string
        }
        Insert: {
          description?: string | null
          expires?: string | null
          external_id: string
          fetched_at?: string
          id?: string
          instructions?: string | null
          onset?: string | null
          quarter_id?: string | null
          severity?: string
          source: string
          title: string
        }
        Update: {
          description?: string | null
          expires?: string | null
          external_id?: string
          fetched_at?: string
          id?: string
          instructions?: string | null
          onset?: string | null
          quarter_id?: string | null
          severity?: string
          source?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "warning_cache_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "warning_cache_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_collection_areas: {
        Row: {
          area_code: string | null
          area_name: string
          created_at: string
          deprecated: boolean
          district: string | null
          ics_url: string | null
          id: string
          municipality: string
          postal_code: string | null
          source_id: string
          street_patterns: string[] | null
        }
        Insert: {
          area_code?: string | null
          area_name: string
          created_at?: string
          deprecated?: boolean
          district?: string | null
          ics_url?: string | null
          id?: string
          municipality: string
          postal_code?: string | null
          source_id: string
          street_patterns?: string[] | null
        }
        Update: {
          area_code?: string | null
          area_name?: string
          created_at?: string
          deprecated?: boolean
          district?: string | null
          ics_url?: string | null
          id?: string
          municipality?: string
          postal_code?: string | null
          source_id?: string
          street_patterns?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "waste_collection_areas_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "waste_collection_areas_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "waste_source_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_collection_dates: {
        Row: {
          area_id: string
          collection_date: string
          created_at: string
          id: string
          is_cancelled: boolean | null
          notes: string | null
          raw_data: Json | null
          replacement_date: string | null
          source_id: string
          sync_batch_id: string | null
          time_hint: string | null
          updated_at: string
          waste_type: Database["public"]["Enums"]["waste_type"]
        }
        Insert: {
          area_id: string
          collection_date: string
          created_at?: string
          id?: string
          is_cancelled?: boolean | null
          notes?: string | null
          raw_data?: Json | null
          replacement_date?: string | null
          source_id: string
          sync_batch_id?: string | null
          time_hint?: string | null
          updated_at?: string
          waste_type: Database["public"]["Enums"]["waste_type"]
        }
        Update: {
          area_id?: string
          collection_date?: string
          created_at?: string
          id?: string
          is_cancelled?: boolean | null
          notes?: string | null
          raw_data?: Json | null
          replacement_date?: string | null
          source_id?: string
          sync_batch_id?: string | null
          time_hint?: string | null
          updated_at?: string
          waste_type?: Database["public"]["Enums"]["waste_type"]
        }
        Relationships: [
          {
            foreignKeyName: "waste_collection_dates_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["area_id"]
          },
          {
            foreignKeyName: "waste_collection_dates_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "waste_collection_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_collection_dates_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "waste_collection_dates_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "waste_source_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_reminders: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          remind_at: Database["public"]["Enums"]["waste_remind_time"] | null
          user_id: string
          waste_type: Database["public"]["Enums"]["waste_type"]
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          remind_at?: Database["public"]["Enums"]["waste_remind_time"] | null
          user_id: string
          waste_type: Database["public"]["Enums"]["waste_type"]
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          remind_at?: Database["public"]["Enums"]["waste_remind_time"] | null
          user_id?: string
          waste_type?: Database["public"]["Enums"]["waste_type"]
        }
        Relationships: []
      }
      waste_schedules: {
        Row: {
          collection_date: string
          created_at: string | null
          id: string
          notes: string | null
          quarter_id: string
          source: Database["public"]["Enums"]["waste_source"] | null
          waste_type: Database["public"]["Enums"]["waste_type"]
        }
        Insert: {
          collection_date: string
          created_at?: string | null
          id?: string
          notes?: string | null
          quarter_id: string
          source?: Database["public"]["Enums"]["waste_source"] | null
          waste_type: Database["public"]["Enums"]["waste_type"]
        }
        Update: {
          collection_date?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          quarter_id?: string
          source?: Database["public"]["Enums"]["waste_source"] | null
          waste_type?: Database["public"]["Enums"]["waste_type"]
        }
        Relationships: [
          {
            foreignKeyName: "waste_schedules_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "waste_schedules_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_source_registry: {
        Row: {
          connector_config: Json
          connector_type: Database["public"]["Enums"]["connector_type"]
          contact_info: Json | null
          coverage_description: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          last_sync_dates_count: number | null
          last_sync_error: string | null
          last_sync_status: Database["public"]["Enums"]["sync_status"] | null
          name: string
          next_sync_at: string | null
          region: string
          slug: string
          sync_enabled: boolean
          sync_interval_hours: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          connector_config?: Json
          connector_type?: Database["public"]["Enums"]["connector_type"]
          contact_info?: Json | null
          coverage_description?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_sync_dates_count?: number | null
          last_sync_error?: string | null
          last_sync_status?: Database["public"]["Enums"]["sync_status"] | null
          name: string
          next_sync_at?: string | null
          region: string
          slug: string
          sync_enabled?: boolean
          sync_interval_hours?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          connector_config?: Json
          connector_type?: Database["public"]["Enums"]["connector_type"]
          contact_info?: Json | null
          coverage_description?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_sync_dates_count?: number | null
          last_sync_error?: string | null
          last_sync_status?: Database["public"]["Enums"]["sync_status"] | null
          name?: string
          next_sync_at?: string | null
          region?: string
          slug?: string
          sync_enabled?: boolean
          sync_interval_hours?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      waste_sync_log: {
        Row: {
          batch_id: string
          change_summary: Json | null
          dates_cancelled: number | null
          dates_fetched: number | null
          dates_inserted: number | null
          dates_unchanged: number | null
          dates_updated: number | null
          error_details: Json | null
          error_message: string | null
          finished_at: string | null
          has_changes: boolean | null
          id: string
          source_id: string
          started_at: string
          status: Database["public"]["Enums"]["sync_status"]
        }
        Insert: {
          batch_id?: string
          change_summary?: Json | null
          dates_cancelled?: number | null
          dates_fetched?: number | null
          dates_inserted?: number | null
          dates_unchanged?: number | null
          dates_updated?: number | null
          error_details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          has_changes?: boolean | null
          id?: string
          source_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
        }
        Update: {
          batch_id?: string
          change_summary?: Json | null
          dates_cancelled?: number | null
          dates_fetched?: number | null
          dates_inserted?: number | null
          dates_unchanged?: number | null
          dates_updated?: number | null
          error_details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          has_changes?: boolean | null
          id?: string
          source_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
        }
        Relationships: [
          {
            foreignKeyName: "waste_sync_log_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "waste_sync_log_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "waste_source_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configs: {
        Row: {
          active: boolean
          created_at: string
          events: string[]
          id: string
          org_id: string | null
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          org_id?: string | null
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          org_id?: string | null
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_code: number | null
          status: string
          webhook_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_code?: number | null
          status?: string
          webhook_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_code?: number | null
          status?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          delivery_attempts: number | null
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          delivery_attempts?: number | null
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          delivery_attempts?: number | null
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
        }
        Relationships: []
      }
      youth_badges: {
        Row: {
          condition_type: string
          condition_value: Json
          created_at: string
          description: string
          icon_url: string | null
          id: string
          min_access_level: string
          slug: string
          title: string
        }
        Insert: {
          condition_type: string
          condition_value?: Json
          created_at?: string
          description: string
          icon_url?: string | null
          id?: string
          min_access_level?: string
          slug: string
          title: string
        }
        Update: {
          condition_type?: string
          condition_value?: Json
          created_at?: string
          description?: string
          icon_url?: string | null
          id?: string
          min_access_level?: string
          slug?: string
          title?: string
        }
        Relationships: []
      }
      youth_earned_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youth_earned_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "youth_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      youth_guardian_consents: {
        Row: {
          consent_text_version: string
          created_at: string
          granted_at: string | null
          granted_ip: string | null
          granted_user_agent: string | null
          granted_via: string | null
          guardian_name: string | null
          guardian_phone_hash: string
          id: string
          revoked_at: string | null
          revoked_ip: string | null
          revoked_user_agent: string | null
          revoked_via: string | null
          status: string
          token_expires_at: string
          token_hash: string
          token_last_sent_at: string | null
          token_send_count: number
          youth_user_id: string
        }
        Insert: {
          consent_text_version?: string
          created_at?: string
          granted_at?: string | null
          granted_ip?: string | null
          granted_user_agent?: string | null
          granted_via?: string | null
          guardian_name?: string | null
          guardian_phone_hash: string
          id?: string
          revoked_at?: string | null
          revoked_ip?: string | null
          revoked_user_agent?: string | null
          revoked_via?: string | null
          status?: string
          token_expires_at: string
          token_hash: string
          token_last_sent_at?: string | null
          token_send_count?: number
          youth_user_id: string
        }
        Update: {
          consent_text_version?: string
          created_at?: string
          granted_at?: string | null
          granted_ip?: string | null
          granted_user_agent?: string | null
          granted_via?: string | null
          guardian_name?: string | null
          guardian_phone_hash?: string
          id?: string
          revoked_at?: string | null
          revoked_ip?: string | null
          revoked_user_agent?: string | null
          revoked_via?: string | null
          status?: string
          token_expires_at?: string
          token_hash?: string
          token_last_sent_at?: string | null
          token_send_count?: number
          youth_user_id?: string
        }
        Relationships: []
      }
      youth_moderation_log: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id: string
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      youth_points_ledger: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points: number
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points: number
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      youth_profiles: {
        Row: {
          access_level: string
          age_group: string
          birth_year: number
          created_at: string
          id: string
          phone_hash: string
          quarter_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string
          age_group: string
          birth_year: number
          created_at?: string
          id?: string
          phone_hash: string
          quarter_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string
          age_group?: string
          birth_year?: number
          created_at?: string
          id?: string
          phone_hash?: string
          quarter_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youth_profiles_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "youth_profiles_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      youth_tasks: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          category: string
          completed_at: string | null
          confirmed_by_creator: boolean
          created_at: string
          created_by: string
          created_by_org: string | null
          description: string
          estimated_minutes: number | null
          id: string
          moderation_status: string
          points_reward: number
          quarter_id: string
          requires_org: boolean
          risk_level: string
          status: string
          title: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          category: string
          completed_at?: string | null
          confirmed_by_creator?: boolean
          created_at?: string
          created_by: string
          created_by_org?: string | null
          description: string
          estimated_minutes?: number | null
          id?: string
          moderation_status?: string
          points_reward?: number
          quarter_id: string
          requires_org?: boolean
          risk_level?: string
          status?: string
          title: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          category?: string
          completed_at?: string | null
          confirmed_by_creator?: boolean
          created_at?: string
          created_by?: string
          created_by_org?: string | null
          description?: string
          estimated_minutes?: number | null
          id?: string
          moderation_status?: string
          points_reward?: number
          quarter_id?: string
          requires_org?: boolean
          risk_level?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "youth_tasks_created_by_org_fkey"
            columns: ["created_by_org"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youth_tasks_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarter_collection_areas"
            referencedColumns: ["quarter_id"]
          },
          {
            foreignKeyName: "youth_tasks_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      quarter_collection_areas: {
        Row: {
          area_id: string | null
          area_name: string | null
          ics_url: string | null
          quarter_id: string | null
          quarter_name: string | null
          source_id: string | null
          source_name: string | null
          source_slug: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      assign_point_to_quarter: {
        Args: {
          p_city?: string
          p_country?: string
          p_point: unknown
          p_quarter_name?: string
          p_state?: string
        }
        Returns: string
      }
      calculate_new_centroid: {
        Args: { p_new_point: unknown; p_quarter_id: string }
        Returns: unknown
      }
      care_helper_role: { Args: { p_senior_id: string }; Returns: string }
      check_max_radius: {
        Args: {
          p_max_radius_m?: number
          p_new_centroid: unknown
          p_quarter_id: string
        }
        Returns: boolean
      }
      cleanup_expired_data: { Args: never; Returns: Json }
      cleanup_old_heartbeats: { Args: never; Returns: undefined }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_nearest_quarter_member: {
        Args: { p_point: unknown; p_radius_m?: number }
        Returns: {
          distance_m: number
          quarter_id: string
        }[]
      }
      find_nearest_seeding_quarter: {
        Args: { p_lat: number; p_lng: number; p_radius_m?: number }
        Returns: {
          distance_m: number
          id: string
          name: string
          status: string
        }[]
      }
      find_quarter_containing_point: {
        Args: { p_lat: number; p_lng: number }
        Returns: {
          id: string
          name: string
          status: string
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_org_assigned_quarter_ids: { Args: never; Returns: string[] }
      get_user_org_quarters: { Args: never; Returns: string[] }
      get_user_quarter_id: { Args: never; Returns: string }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      is_any_org_admin: { Args: never; Returns: boolean }
      is_care_helper_for: { Args: { p_senior_id: string }; Returns: boolean }
      is_org_admin_for_quarter: {
        Args: { check_quarter_id: string }
        Returns: boolean
      }
      is_org_admin_of: { Args: { check_org_id: string }; Returns: boolean }
      is_org_member_of: { Args: { check_org_id: string }; Returns: boolean }
      is_quarter_admin_for: { Args: { p_quarter_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_verified_member: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      register_doctor: {
        Args: {
          p_bsnr: string
          p_consent_avv_version_id?: string
          p_consent_dsgvo_version_id?: string
          p_consent_marketing_version_id?: string
          p_fachrichtung: string
          p_full_name: string
          p_ip_hash?: string
          p_lanr: string
          p_praxis_address: string
          p_praxis_name: string
          p_praxis_website?: string
          p_user_id: string
        }
        Returns: Json
      }
      set_quarter_boundary_circle: {
        Args: { p_quarter_id: string; p_radius_m?: number }
        Returns: undefined
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      user_civic_org_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      announcement_category:
        | "verkehr"
        | "baustelle"
        | "veranstaltung"
        | "verwaltung"
        | "warnung"
        | "sonstiges"
        | "verein"
        | "soziales"
        | "entsorgung"
      connector_type: "ics" | "api" | "csv" | "scraper" | "manual"
      external_warning_provider: "nina" | "dwd" | "uba"
      external_warning_severity:
        | "minor"
        | "moderate"
        | "severe"
        | "extreme"
        | "unknown"
      external_warning_status: "active" | "superseded" | "expired" | "cancelled"
      memory_actor_role: "senior" | "caregiver" | "ai" | "care_team" | "system"
      memory_audit_action:
        | "create"
        | "update"
        | "delete"
        | "reset"
        | "consent_grant"
        | "consent_revoke"
      memory_category:
        | "profile"
        | "routine"
        | "preference"
        | "contact"
        | "care_need"
        | "personal"
      memory_consent_level: "basis" | "care" | "personal"
      memory_consent_type: "memory_basis" | "memory_care" | "memory_personal"
      memory_source: "self" | "caregiver" | "ai_learned" | "care_team"
      memory_visibility: "private" | "care_team"
      org_member_role: "admin" | "viewer"
      org_type: "municipality" | "care_service" | "housing" | "social_service"
      org_verification_status: "pending" | "verified" | "rejected"
      report_category:
        | "street"
        | "lighting"
        | "greenery"
        | "waste"
        | "vandalism"
        | "other"
      report_status: "open" | "acknowledged" | "in_progress" | "resolved"
      sync_status: "running" | "success" | "partial" | "error"
      waste_remind_time: "evening_before" | "morning_of"
      waste_source: "manual" | "ical" | "api" | "csv" | "scraper"
      waste_type:
        | "restmuell"
        | "biomuell"
        | "papier"
        | "gelber_sack"
        | "gruenschnitt"
        | "sperrmuell"
        | "altglas"
        | "elektroschrott"
        | "sondermuell"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      announcement_category: [
        "verkehr",
        "baustelle",
        "veranstaltung",
        "verwaltung",
        "warnung",
        "sonstiges",
        "verein",
        "soziales",
        "entsorgung",
      ],
      connector_type: ["ics", "api", "csv", "scraper", "manual"],
      external_warning_provider: ["nina", "dwd", "uba"],
      external_warning_severity: [
        "minor",
        "moderate",
        "severe",
        "extreme",
        "unknown",
      ],
      external_warning_status: ["active", "superseded", "expired", "cancelled"],
      memory_actor_role: ["senior", "caregiver", "ai", "care_team", "system"],
      memory_audit_action: [
        "create",
        "update",
        "delete",
        "reset",
        "consent_grant",
        "consent_revoke",
      ],
      memory_category: [
        "profile",
        "routine",
        "preference",
        "contact",
        "care_need",
        "personal",
      ],
      memory_consent_level: ["basis", "care", "personal"],
      memory_consent_type: ["memory_basis", "memory_care", "memory_personal"],
      memory_source: ["self", "caregiver", "ai_learned", "care_team"],
      memory_visibility: ["private", "care_team"],
      org_member_role: ["admin", "viewer"],
      org_type: ["municipality", "care_service", "housing", "social_service"],
      org_verification_status: ["pending", "verified", "rejected"],
      report_category: [
        "street",
        "lighting",
        "greenery",
        "waste",
        "vandalism",
        "other",
      ],
      report_status: ["open", "acknowledged", "in_progress", "resolved"],
      sync_status: ["running", "success", "partial", "error"],
      waste_remind_time: ["evening_before", "morning_of"],
      waste_source: ["manual", "ical", "api", "csv", "scraper"],
      waste_type: [
        "restmuell",
        "biomuell",
        "papier",
        "gelber_sack",
        "gruenschnitt",
        "sperrmuell",
        "altglas",
        "elektroschrott",
        "sondermuell",
      ],
    },
  },
} as const
