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
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          official_website: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          official_website?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          official_website?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chantiers: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          address_chantier: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          order_id: string | null
          planned_end: string | null
          planned_start: string | null
          reference: string
          site_id: string | null
          status: Database["public"]["Enums"]["chantier_status"]
          team_lead: string | null
          team_members: string[] | null
          technical_notes: string | null
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          address_chantier?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          order_id?: string | null
          planned_end?: string | null
          planned_start?: string | null
          reference: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["chantier_status"]
          team_lead?: string | null
          team_members?: string[] | null
          technical_notes?: string | null
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          address_chantier?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_id?: string | null
          planned_end?: string | null
          planned_start?: string | null
          reference?: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["chantier_status"]
          team_lead?: string | null
          team_members?: string[] | null
          technical_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chantiers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      client_orders: {
        Row: {
          advance_amount: number | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          initial_delay_days: number | null
          notes: string | null
          reference: string
          site_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_ht: number | null
          total_ttc: number | null
          tva_amount: number | null
          updated_at: string
          validated_by: string | null
        }
        Insert: {
          advance_amount?: number | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          initial_delay_days?: number | null
          notes?: string | null
          reference?: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_ht?: number | null
          total_ttc?: number | null
          tva_amount?: number | null
          updated_at?: string
          validated_by?: string | null
        }
        Update: {
          advance_amount?: number | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          initial_delay_days?: number | null
          notes?: string | null
          reference?: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_ht?: number | null
          total_ttc?: number | null
          tva_amount?: number | null
          updated_at?: string
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          access_instructions: string | null
          address: string | null
          city: string | null
          commercial_id: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_instructions?: string | null
          address?: string | null
          city?: string | null
          commercial_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_instructions?: string | null
          address?: string | null
          city?: string | null
          commercial_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      delay_reports: {
        Row: {
<<<<<<< HEAD
          id: string
          step_id: string | null
          order_id: string | null
          reported_by: string | null
          cause_text: string
          blamed_role: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          step_id?: string | null
          order_id?: string | null
          reported_by?: string | null
          cause_text: string
          blamed_role?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          step_id?: string | null
          order_id?: string | null
          reported_by?: string | null
          cause_text?: string
          blamed_role?: string | null
          created_at?: string | null
=======
          blamed_role: string | null
          cause_text: string
          created_at: string | null
          id: string
          order_id: string | null
          reported_by: string | null
          step_id: string | null
        }
        Insert: {
          blamed_role?: string | null
          cause_text: string
          created_at?: string | null
          id?: string
          order_id?: string | null
          reported_by?: string | null
          step_id?: string | null
        }
        Update: {
          blamed_role?: string | null
          cause_text?: string
          created_at?: string | null
          id?: string
          order_id?: string | null
          reported_by?: string | null
          step_id?: string | null
>>>>>>> 5c8621455a4b4de9195e2e3e942de50ee8f150f1
        }
        Relationships: [
          {
            foreignKeyName: "delay_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
          {
<<<<<<< HEAD
            foreignKeyName: "delay_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
=======
>>>>>>> 5c8621455a4b4de9195e2e3e942de50ee8f150f1
            foreignKeyName: "delay_reports_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "order_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      delegations: {
        Row: {
          created_at: string
          end_date: string | null
          from_user_id: string
          id: string
          reason: string | null
          role: string
          start_date: string
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          from_user_id: string
          id?: string
          reason?: string | null
          role: string
          start_date?: string
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          from_user_id?: string
          id?: string
          reason?: string | null
          role?: string
          start_date?: string
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          actual_date: string | null
          carrier_name: string | null
          carrier_type: string | null
          client_notes: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          order_id: string
          photo_after_url: string | null
          photo_before_url: string | null
          pv_signed: boolean | null
          pv_url: string | null
          scheduled_date: string | null
          site_id: string | null
          status: string
          tech_notes: string | null
          technician_id: string | null
          tracking_number: string | null
          transport_cost: number | null
          updated_at: string
          vehicle_plate: string | null
        }
        Insert: {
          actual_date?: string | null
          carrier_name?: string | null
          carrier_type?: string | null
          client_notes?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          order_id: string
          photo_after_url?: string | null
          photo_before_url?: string | null
          pv_signed?: boolean | null
          pv_url?: string | null
          scheduled_date?: string | null
          site_id?: string | null
          status?: string
          tech_notes?: string | null
          technician_id?: string | null
          tracking_number?: string | null
          transport_cost?: number | null
          updated_at?: string
          vehicle_plate?: string | null
        }
        Update: {
          actual_date?: string | null
          carrier_name?: string | null
          carrier_type?: string | null
          client_notes?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          order_id?: string
          photo_after_url?: string | null
          photo_before_url?: string | null
          pv_signed?: boolean | null
          pv_url?: string | null
          scheduled_date?: string | null
          site_id?: string | null
          status?: string
          tech_notes?: string | null
          technician_id?: string | null
          tracking_number?: string | null
          transport_cost?: number | null
          updated_at?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          issue_date: string | null
          order_id: string
          pdf_url: string | null
          reference: string
          status: Database["public"]["Enums"]["invoice_status"]
          total_ht: number | null
          total_ttc: number | null
          tva_amount: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          issue_date?: string | null
          order_id: string
          pdf_url?: string | null
          reference: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total_ht?: number | null
          total_ttc?: number | null
          tva_amount?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          issue_date?: string | null
          order_id?: string
          pdf_url?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total_ht?: number | null
          total_ttc?: number | null
          tva_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_required: boolean | null
          action_type: string | null
          alert_level: Database["public"]["Enums"]["alert_level"] | null
          created_at: string
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          related_order_id: string | null
          related_step_id: string | null
<<<<<<< HEAD
          action_required: boolean | null
          action_type: string | null
=======
>>>>>>> 5c8621455a4b4de9195e2e3e942de50ee8f150f1
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_required?: boolean | null
          action_type?: string | null
          alert_level?: Database["public"]["Enums"]["alert_level"] | null
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          related_order_id?: string | null
          related_step_id?: string | null
<<<<<<< HEAD
          action_required?: boolean | null
          action_type?: string | null
=======
>>>>>>> 5c8621455a4b4de9195e2e3e942de50ee8f150f1
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_required?: boolean | null
          action_type?: string | null
          alert_level?: Database["public"]["Enums"]["alert_level"] | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          related_order_id?: string | null
          related_step_id?: string | null
<<<<<<< HEAD
          action_required?: boolean | null
          action_type?: string | null
=======
>>>>>>> 5c8621455a4b4de9195e2e3e942de50ee8f150f1
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_step_id_fkey"
            columns: ["related_step_id"]
            isOneToOne: false
            referencedRelation: "order_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string
          quantity: number
          total_ht: number
          total_ttc: number
          tva_rate: number | null
          unit_price_ht: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id: string
          quantity?: number
          total_ht?: number
          total_ttc?: number
          tva_rate?: number | null
          unit_price_ht?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string
          quantity?: number
          total_ht?: number
          total_ttc?: number
          tva_rate?: number | null
          unit_price_ht?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_workflow_steps: {
        Row: {
          assigned_to: string | null
          blamed_service: string | null
          completed_at: string | null
          created_at: string
          deadline_set_at: string | null
          delay_cause: string | null
          delay_days: number | null
          delay_justified_at: string | null
          delay_justified_by: string | null
          delay_reason: string | null
          due_date: string | null
          estimated_duration_days: number | null
          id: string
          notes: string | null
          order_id: string
          responsible_role: Database["public"]["Enums"]["app_role"] | null
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_step_status"]
          step_name: Database["public"]["Enums"]["workflow_step_name"]
          step_order: number
          updated_at: string
          estimated_duration_days: number | null
          deadline_set_at: string | null
          delay_cause: string | null
          blamed_service: string | null
        }
        Insert: {
          assigned_to?: string | null
          blamed_service?: string | null
          completed_at?: string | null
          created_at?: string
          deadline_set_at?: string | null
          delay_cause?: string | null
          delay_days?: number | null
          delay_justified_at?: string | null
          delay_justified_by?: string | null
          delay_reason?: string | null
          due_date?: string | null
          estimated_duration_days?: number | null
          id?: string
          notes?: string | null
          order_id: string
          responsible_role?: Database["public"]["Enums"]["app_role"] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_step_status"]
          step_name: Database["public"]["Enums"]["workflow_step_name"]
          step_order: number
          updated_at?: string
          estimated_duration_days?: number | null
          deadline_set_at?: string | null
          delay_cause?: string | null
          blamed_service?: string | null
        }
        Update: {
          assigned_to?: string | null
          blamed_service?: string | null
          completed_at?: string | null
          created_at?: string
          deadline_set_at?: string | null
          delay_cause?: string | null
          delay_days?: number | null
          delay_justified_at?: string | null
          delay_justified_by?: string | null
          delay_reason?: string | null
          due_date?: string | null
          estimated_duration_days?: number | null
          id?: string
          notes?: string | null
          order_id?: string
          responsible_role?: Database["public"]["Enums"]["app_role"] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_step_status"]
          step_name?: Database["public"]["Enums"]["workflow_step_name"]
          step_order?: number
          updated_at?: string
          estimated_duration_days?: number | null
          deadline_set_at?: string | null
          delay_cause?: string | null
          blamed_service?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_workflow_steps_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          payment_date: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["payment_status"]
          unpaid_reason: string | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          unpaid_reason?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          unpaid_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price_ht: number
          sku: string | null
          supplier_id: string | null
          tva_rate: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price_ht?: number
          sku?: string | null
          supplier_id?: string | null
          tva_rate?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price_ht?: number
          sku?: string | null
          supplier_id?: string | null
          tva_rate?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          notes: string | null
          product_id: string | null
          purchase_order_id: string
          quantity: number
          unit_price_eur: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_order_id: string
          quantity?: number
          unit_price_eur?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          unit_price_eur?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_arrival: string | null
          brand_id: string | null
          created_at: string
          created_by: string | null
          customs_fees: number | null
          customs_notes: string | null
          estimated_arrival: string | null
          exchange_rate: number | null
          id: string
          notes: string | null
          reference: string
          status: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id: string | null
          total_amount_eur: number | null
          total_amount_tnd: number | null
          transit_notes: string | null
          transport_fees: number | null
          updated_at: string
        }
        Insert: {
          actual_arrival?: string | null
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          customs_fees?: number | null
          customs_notes?: string | null
          estimated_arrival?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          reference: string
          status?: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id?: string | null
          total_amount_eur?: number | null
          total_amount_tnd?: number | null
          transit_notes?: string | null
          transport_fees?: number | null
          updated_at?: string
        }
        Update: {
          actual_arrival?: string | null
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          customs_fees?: number | null
          customs_notes?: string | null
          estimated_arrival?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id?: string | null
          total_amount_eur?: number | null
          total_amount_tnd?: number | null
          transit_notes?: string | null
          transport_fees?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          description: string
          id: string
          product_id: string | null
          quantity: number
          quote_id: string
          total_ht: number
          total_ttc: number
          tva_rate: number | null
          unit_price_ht: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          product_id?: string | null
          quantity?: number
          quote_id: string
          total_ht?: number
          total_ttc?: number
          tva_rate?: number | null
          unit_price_ht?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          product_id?: string | null
          quantity?: number
          quote_id?: string
          total_ht?: number
          total_ttc?: number
          tva_rate?: number | null
          unit_price_ht?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          order_id: string | null
          pdf_url: string | null
          reference: string
          status: Database["public"]["Enums"]["quote_status"]
          total_ht: number | null
          total_ttc: number | null
          tva_amount: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string | null
          pdf_url?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["quote_status"]
          total_ht?: number | null
          total_ttc?: number | null
          tva_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string | null
          pdf_url?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["quote_status"]
          total_ht?: number | null
          total_ttc?: number | null
          tva_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sav_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_internal: boolean | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sav_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "sav_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      sav_tickets: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          order_id: string | null
          priority: string | null
          reference: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["sav_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          priority?: string | null
          reference?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["sav_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          priority?: string | null
          reference?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["sav_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sav_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sav_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stock: {
        Row: {
          id: string
          location: string | null
          min_quantity: number | null
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          location?: string | null
          min_quantity?: number | null
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          location?: string | null
          min_quantity?: number | null
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          quantity: number
          reason: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          quantity: number
          reason?: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          type?: Database["public"]["Enums"]["stock_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_orders: {
        Row: {
          actual_delivery: string | null
          client_order_id: string | null
          created_at: string
          created_by: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          order_date: string | null
          reference: string
          status: string
          supplier_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          actual_delivery?: string | null
          client_order_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          reference: string
          status?: string
          supplier_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          actual_delivery?: string | null
          client_order_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          reference?: string
          status?: string
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_client_order_id_fkey"
            columns: ["client_order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean | null
          address: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_justifications: {
        Row: {
          blamed_role: Database["public"]["Enums"]["app_role"] | null
          content: string
          created_at: string
          id: string
          justified_by: string
          step_id: string
        }
        Insert: {
          blamed_role?: Database["public"]["Enums"]["app_role"] | null
          content: string
          created_at?: string
          id?: string
          justified_by: string
          step_id: string
        }
        Update: {
          blamed_role?: Database["public"]["Enums"]["app_role"] | null
          content?: string
          created_at?: string
          id?: string
          justified_by?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_justifications_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "order_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_overdue_workflow_steps: { Args: never; Returns: number }
      check_workflow_deadlines: { Args: never; Returns: undefined }
      current_user_has_role: { Args: { _role: string }; Returns: boolean }
      get_ca_evolution_12months: {
        Args: never
        Returns: {
          ca: number
          mois: string
        }[]
      }
      get_current_month_ca: { Args: never; Returns: number }
      get_my_role: { Args: never; Returns: string[] }
      get_orders_status_distribution: {
        Args: never
        Returns: {
          name: string
          value: number
        }[]
      }
      get_top_commerciaux: {
        Args: { limit_n?: number }
        Returns: {
          ca: number
          nom: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_internal_staff: { Args: { _user_id: string }; Returns: boolean }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      is_manager_absent: { Args: never; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      notify_management:
        | {
            Args: {
              p_alert_level?: Database["public"]["Enums"]["alert_level"]
              p_message: string
              p_order_id: string
              p_title: string
              p_type?: Database["public"]["Enums"]["notification_type"]
            }
            Returns: undefined
          }
        | {
            Args: {
              p_message: string
              p_order_id?: string
              p_step_id?: string
              p_title: string
              p_type: string
            }
            Returns: undefined
          }
      notify_users_by_role: {
        Args: {
          p_action_required?: boolean
          p_action_type?: string
          p_message: string
          p_order_id?: string
          p_role: string
          p_step_id?: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      alert_level: "jaune" | "rouge" | "bleue" | "rouge_clignotant"
      app_role:
      | "manager"
      | "directeur_exploitation"
      | "responsable_achat"
      | "responsable_logistique"
      | "responsable_commercial"
      | "commercial"
      | "responsable_technique"
      | "technicien_montage"
      | "responsable_sav"
      | "responsable_comptabilite"
      | "client"
      | "responsable_showroom"
      | "livraison"
      chantier_status:
      | "planifie"
      | "en_cours"
      | "en_attente"
      | "termine"
      | "annule"
      invoice_status:
      | "brouillon"
      | "emise"
      | "payee_partiel"
      | "payee"
      | "impayee"
      | "annulee"
      notification_type:
      | "info"
      | "alerte_delai"
      | "depassement"
      | "transition"
      | "urgente"
      order_status:
<<<<<<< HEAD
      | "brouillon"
      | "en_validation"
      | "validee"
      | "en_commande_fournisseur"
      | "en_reception"
      | "en_preparation"
      | "en_livraison"
      | "livree"
      | "en_facturation"
      | "payee"
      | "cloturee"
      | "annulee"
      payment_method:
      | "especes"
      | "cheque"
      | "virement"
      | "carte_bancaire"
      | "traite_bancaire"
      payment_status: "en_attente" | "confirme" | "rejete"
=======
        | "brouillon"
        | "en_validation"
        | "validee"
        | "en_commande_fournisseur"
        | "en_reception"
        | "en_preparation"
        | "en_livraison"
        | "livree"
        | "en_facturation"
        | "payee"
        | "cloturee"
        | "annulee"
        | "en_cours"
        | "terminee"
      payment_method:
        | "especes"
        | "cheque"
        | "virement"
        | "carte_bancaire"
        | "traite_bancaire"
      payment_status: "en_attente" | "confirme" | "rejete" | "complete"
>>>>>>> 5c8621455a4b4de9195e2e3e942de50ee8f150f1
      purchase_order_status:
      | "brouillon"
      | "en_commande"
      | "en_transit"
      | "en_douane"
      | "receptionne"
      | "annule"
      quote_status:
      | "brouillon"
      | "en_validation"
      | "accepte"
      | "refuse"
      | "expire"
      sav_status: "ouvert" | "en_cours" | "resolu" | "ferme"
      stock_movement_type: "in" | "out" | "adjustment"
      workflow_step_name:
      | "creation_commande"
      | "validation_commerciale"
      | "commande_fournisseur"
      | "reception_marchandises"
      | "preparation_technique"
      | "livraison_installation"
      | "validation_client"
      | "facturation_paiement"
      | "cloture_archivage"
      workflow_step_status:
      | "pending"
      | "in_progress"
      | "completed"
      | "delayed"
      | "blocked"
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
      alert_level: ["jaune", "rouge", "bleue", "rouge_clignotant"],
      app_role: [
        "manager",
        "directeur_exploitation",
        "responsable_achat",
        "responsable_logistique",
        "responsable_commercial",
        "commercial",
        "responsable_technique",
        "technicien_montage",
        "responsable_sav",
        "responsable_comptabilite",
        "client",
        "responsable_showroom",
        "livraison",
      ],
      chantier_status: [
        "planifie",
        "en_cours",
        "en_attente",
        "termine",
        "annule",
      ],
      invoice_status: [
        "brouillon",
        "emise",
        "payee_partiel",
        "payee",
        "impayee",
        "annulee",
      ],
      notification_type: [
        "info",
        "alerte_delai",
        "depassement",
        "transition",
        "urgente",
      ],
      order_status: [
        "brouillon",
        "en_validation",
        "validee",
        "en_commande_fournisseur",
        "en_reception",
        "en_preparation",
        "en_livraison",
        "livree",
        "en_facturation",
        "payee",
        "cloturee",
        "annulee",
        "en_cours",
        "terminee",
      ],
      payment_method: [
        "especes",
        "cheque",
        "virement",
        "carte_bancaire",
        "traite_bancaire",
      ],
      payment_status: ["en_attente", "confirme", "rejete", "complete"],
      purchase_order_status: [
        "brouillon",
        "en_commande",
        "en_transit",
        "en_douane",
        "receptionne",
        "annule",
      ],
      quote_status: [
        "brouillon",
        "en_validation",
        "accepte",
        "refuse",
        "expire",
      ],
      sav_status: ["ouvert", "en_cours", "resolu", "ferme"],
      stock_movement_type: ["in", "out", "adjustment"],
      workflow_step_name: [
        "creation_commande",
        "validation_commerciale",
        "commande_fournisseur",
        "reception_marchandises",
        "preparation_technique",
        "livraison_installation",
        "validation_client",
        "facturation_paiement",
        "cloture_archivage",
      ],
      workflow_step_status: [
        "pending",
        "in_progress",
        "completed",
        "delayed",
        "blocked",
      ],
    },
  },
} as const
