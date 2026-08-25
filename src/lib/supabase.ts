import { createClient } from "@supabase/supabase-js";

// Fill these in after creating a free project at https://supabase.com —
// Project Settings -> API. The anon key is safe to expose in frontend code;
// real data protection comes from Row Level Security policies on each table.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// A placeholder pair so createClient() never throws before the real
// project exists — isSupabaseConfigured is what actually gates whether
// the app tries to use it (see App.tsx).
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "public-anon-key-placeholder"
);
