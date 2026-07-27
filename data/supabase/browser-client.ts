import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/data/supabase/database.types";
import { getPublicSupabaseEnv } from "@/data/supabase/env-public";

/**
 * Creates the browser-side Supabase client.
 *
 * @supabase/ssr keeps this client as a browser singleton by default, so auth
 * state survives Client Component re-renders without exposing server secrets.
 */
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getPublicSupabaseEnv();

  return createBrowserClient<Database>(url, publishableKey);
}
