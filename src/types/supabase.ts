// src/types/supabase.ts
export type Database = {
  public: {
    Tables: {
      simple_profile: {
        Row: {
          user_id: string;
          answers: Record<string, unknown>;
          completed: boolean;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          answers?: Record<string, unknown>;
          completed?: boolean;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          answers?: Record<string, unknown>;
          completed?: boolean;
          updated_at?: string | null;
        };
      };

      simple_flow_state: {
        Row: {
          user_id: string;
          state: Record<string, unknown>;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          state?: Record<string, unknown>;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          state?: Record<string, unknown>;
          updated_at?: string | null;
        };
      };

      // si también usás profiles en otros lados, podés dejarlo mínimo:
      profiles: {
        Row: {
          id: string;
          plan?: string | null;
          premium_until?: string | null;
        };
        Insert: {
          id: string;
          plan?: string | null;
          premium_until?: string | null;
        };
        Update: {
          id?: string;
          plan?: string | null;
          premium_until?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
