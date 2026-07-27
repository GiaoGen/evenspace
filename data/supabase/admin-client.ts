import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/data/supabase/database.types";
import { getServerSupabaseEnv } from "@/data/supabase/env-server";

/**
 * Creates a privileged, server-only Supabase client.
 *
 * Keep this out of user-request data paths unless bypassing RLS is explicitly
 * required. The secret is read lazily so local UI work can run without it.
 */
export function createSupabaseAdminClient() {
  const { url, secretKey } = getServerSupabaseEnv();

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
