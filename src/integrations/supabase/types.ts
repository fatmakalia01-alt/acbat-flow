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
      client_orders: {
        Row: {
          advance_amount: number | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          reference: string
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
          notes?: string | null
          reference?: string
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
          notes?: string | null
          reference?: string
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
      delegations: {
        Row: {
          active: boolean | null
          created_at: string
          delegatee_id: string
          delegator_id: string
          ended_at: string | null
          id: string
          reason: string | null
          started_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          delegatee_id: string
          delegator_id: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          started_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          delegatee_id?: string
          delegator_id?: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          started_at?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          actual_date: string | null
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
          status: string
          tech_notes: string | null
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
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
          status?: string
          tech_notes?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
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
          status?: string
          tech_notes?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
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
          alert_level: Database["public"]["Enums"]["alert_level"] | null
          created_at: string
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          related_order_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          alert_level?: Database["public"]["Enums"]["alert_level"] | null
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          related_order_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          alert_level?: Database["public"]["Enums"]["alert_level"] | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          related_order_id?: string | null
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
          completed_at: string | null
          created_at: string
          delay_days: number | null
          delay_justified_at: string | null
          delay_justified_by: string | null
          delay_reason: string | null
          due_date: string | null
          id: string
          notes: string | null
          order_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_step_status"]
          step_name: Database["public"]["Enums"]["workflow_step_name"]
          step_order: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          delay_days?: number | null
          delay_justified_at?: string | null
          delay_justified_by?: string | null
          delay_reason?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_step_status"]
          step_name: Database["public"]["Enums"]["workflow_step_name"]
          step_order: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          delay_days?: number | null
          delay_justified_at?: string | null
          delay_justified_by?: string | null
          delay_reason?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_step_status"]
          step_name?: Database["public"]["Enums"]["workflow_step_name"]
          step_order?: number
          updated_at?: string
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
          updated_at: string
        }
        Insert: {
          active?: boolean | null
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
          updated_at?: string
        }
        Update: {
          active?: boolean | null
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
          updated_at?: string
        }
        Relationships: [
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
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_internal_staff: { Args: { _user_id: string }; Returns: boolean }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
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
      quote_status:
        | "brouillon"
        | "en_validation"
        | "accepte"
        | "refuse"
        | "expire"
      sav_status: "ouvert" | "en_cours" | "resolu" | "ferme"
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
      ],
      payment_method: [
        "especes",
        "cheque",
        "virement",
        "carte_bancaire",
        "traite_bancaire",
      ],
      payment_status: ["en_attente", "confirme", "rejete"],
      quote_status: [
        "brouillon",
        "en_validation",
        "accepte",
        "refuse",
        "expire",
      ],
      sav_status: ["ouvert", "en_cours", "resolu", "ferme"],
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
