import { createClient } from '@supabase/supabase-js';

// Service role client (bypasses RLS) - use sparingly for admin operations
export function supabaseServer() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// Authenticated client (respects RLS) - use for user operations
export function supabaseServerAuth(userToken: string) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      },
      auth: { persistSession: false, autoRefreshToken: false }
    }
  );
}


