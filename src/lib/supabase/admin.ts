import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialized admin client (avoids build-time errors when env vars not set)
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables not set');
    }
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return _supabaseAdmin;
}

// For backwards compatibility - lazy proxy
export const supabaseAdmin = {
  from: (table: string) => getSupabaseAdmin().from(table),
  rpc: (fn: string, params?: object) => getSupabaseAdmin().rpc(fn, params),
};
