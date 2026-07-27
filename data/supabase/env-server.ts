import "server-only";

import {
  parseOptionalSupabaseSecret,
  parseServerSupabaseEnv,
} from "@/data/supabase/env-schema";
import { getPublicSupabaseEnv } from "@/data/supabase/env-public";

export function getServerSupabaseEnv() {
  const publicEnv = getPublicSupabaseEnv();

  return parseServerSupabaseEnv({
    NEXT_PUBLIC_SUPABASE_URL: publicEnv.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicEnv.publishableKey,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
}

export function validateSupabaseStartupEnv() {
  getPublicSupabaseEnv();
  parseOptionalSupabaseSecret(process.env.SUPABASE_SECRET_KEY);
}
