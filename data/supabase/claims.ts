import "server-only";

import { createSupabaseServerClient } from "@/data/supabase/server-client";

/**
 * Returns cryptographically verified claims for the current request.
 *
 * Callers must still enforce resource authorization through RLS and explicit
 * server-side ownership/membership checks.
 */
export async function getCurrentSupabaseClaims() {
  const supabase = await createSupabaseServerClient();

  return supabase.auth.getClaims();
}
