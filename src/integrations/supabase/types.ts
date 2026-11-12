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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      medicines: {
        Row: {
          brand_name: string
          covered_conditions: string[]
          created_at: string
          dosage_form: string | null
          generic_name_xpn: string
          id: string
          manufacturer: string | null
          price: number | null
          reimbursement_percent: number
          reimbursement_status: Database["public"]["Enums"]["reimbursement_status"]
          strength: string | null
        }
        Insert: {
          brand_name: string
          covered_conditions?: string[]
          created_at?: string
          dosage_form?: string | null
          generic_name_xpn: string
          id?: string
          manufacturer?: string | null
          price?: number | null
          reimbursement_percent?: number
          reimbursement_status?: Database["public"]["Enums"]["reimbursement_status"]
          strength?: string | null
        }
        Update: {
          brand_name?: string
          covered_conditions?: string[]
          created_at?: string
          dosage_form?: string | null
          generic_name_xpn?: string
          id?: string
          manufacturer?: string | null
          price?: number | null
          reimbursement_percent?: number
          reimbursement_status?: Database["public"]["Enums"]["reimbursement_status"]
          strength?: string | null
        }
        Relationships: []
      }
      pharmacies: {
        Row: {
          address: string
          city: string
          created_at: string
          id: string
          is_dtsj_partner: boolean
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string | null
          phone: string | null
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          id?: string
          is_dtsj_partner?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id?: string | null
          phone?: string | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          id?: string
          is_dtsj_partner?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      pharmacy_stock: {
        Row: {
          medicine_id: string
          pharmacy_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          medicine_id: string
          pharmacy_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          medicine_id?: string
          pharmacy_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_stock_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_stock_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_sms: {
        Row: {
          created_at: string
          prescription_id: string
          sms_code: string
        }
        Insert: {
          created_at?: string
          prescription_id: string
          sms_code: string
        }
        Update: {
          created_at?: string
          prescription_id?: string
          sms_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_sms_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: true
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          code: string
          created_at: string
          diagnosis: string | null
          dispensed_at: string | null
          dispensed_by: string | null
          doctor_id: string
          dosage: string | null
          expires_at: string
          id: string
          issued_at: string
          medicine_id: string
          notes: string | null
          patient_id: string
          pharmacy_id: string | null
          quantity: number
          status: Database["public"]["Enums"]["prescription_status"]
        }
        Insert: {
          code: string
          created_at?: string
          diagnosis?: string | null
          dispensed_at?: string | null
          dispensed_by?: string | null
          doctor_id: string
          dosage?: string | null
          expires_at: string
          id?: string
          issued_at?: string
          medicine_id: string
          notes?: string | null
          patient_id: string
          pharmacy_id?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["prescription_status"]
        }
        Update: {
          code?: string
          created_at?: string
          diagnosis?: string | null
          dispensed_at?: string | null
          dispensed_by?: string | null
          doctor_id?: string
          dosage?: string | null
          expires_at?: string
          id?: string
          issued_at?: string
          medicine_id?: string
          notes?: string | null
          patient_id?: string
          pharmacy_id?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["prescription_status"]
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dispense_prescription: {
        Args: { _code: string; _pharmacy_id: string; _sms_code: string }
        Returns: Json
      }
      generate_prescription_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "doctor" | "pharmacist"
      prescription_status: "active" | "dispensed" | "cancelled"
      reimbursement_status: "full" | "partial" | "none"
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
  public: {
    Enums: {
      app_role: ["patient", "doctor", "pharmacist"],
      prescription_status: ["active", "dispensed", "cancelled"],
      reimbursement_status: ["full", "partial", "none"],
    },
  },
} as const
