import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/data/supabase/database.types";
import { getPublicSupabaseEnv } from "@/data/supabase/env-public";

/**
 * Creates one cookie-backed client for the current server request.
 *
 * Never cache this client at module scope: its cookie store belongs to exactly
 * one request.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getPublicSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write response cookies. The root Proxy
          // refreshes the session before rendering and persists those cookies.
        }
      },
    },
  });
}
