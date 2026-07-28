"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

export async function updateAccountProfileAction(input: unknown) {
  const parsed = z.object({ displayName: z.string().trim().min(1).max(60), theme: z.enum(["system", "light", "dark"]).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (typeof userId !== "string") return { ok: false as const };
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data.displayName, ...(parsed.data.theme ? { theme: parsed.data.theme } : {}) }).eq("user_id", userId);
  return { ok: !error } as const;
}
