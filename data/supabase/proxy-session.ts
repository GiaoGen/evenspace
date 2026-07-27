import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/data/supabase/database.types";
import { getPublicSupabaseEnv } from "@/data/supabase/env-public";

/**
 * Refreshes cookie-backed auth state before the route renders.
 *
 * This function intentionally does not redirect or authorize business access.
 * Final authorization belongs in server code and Postgres RLS.
 */
export async function refreshSupabaseAuth(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getPublicSupabaseEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  // getClaims verifies identity and triggers refresh when the access token is
  // stale. Do not replace it with getSession for authorization decisions.
  await supabase.auth.getClaims();

  return response;
}
