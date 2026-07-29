"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/data/supabase/database.types";
import { getServerSupabaseEnv } from "@/data/supabase/env-server";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

const avatarInput = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  byteSize: z.number().int().positive().max(5 * 1024 * 1024),
});

type AvatarActionResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly message: string };

type RpcResult<T> = {
  data: T | null;
  error: { message?: string } | null;
};

function avatarRpc<T>(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  name: string,
  args: Record<string, unknown>,
) {
  return (client.rpc as unknown as (
    rpcName: string,
    rpcArgs: Record<string, unknown>,
  ) => Promise<RpcResult<T>>)(name, args);
}

function signingClient() {
  const { url, secretKey } = getServerSupabaseEnv();
  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

export async function prepareAccountAvatarUploadAction(
  input: unknown,
): Promise<AvatarActionResult<{
  assetId: string;
  objectKey: string;
  token: string;
}>> {
  const parsed = avatarInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Use a JPEG, PNG, or WebP image under 5 MB." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await avatarRpc<{
      asset_id: string;
      object_key: string;
    }[]>(supabase, "prepare_profile_avatar_upload", {
      requested_mime_type: parsed.data.mimeType,
      requested_byte_size: parsed.data.byteSize,
    });
    const prepared = data?.[0];
    if (error || !prepared) throw new Error(error?.message ?? "avatar_prepare_failed");

    const { data: signed, error: signedError } = await signingClient()
      .storage.from("room-media")
      .createSignedUploadUrl(prepared.object_key);
    if (signedError || !signed?.token) {
      throw new Error(signedError?.message ?? "avatar_signing_failed");
    }

    return {
      ok: true,
      data: {
        assetId: prepared.asset_id,
        objectKey: prepared.object_key,
        token: signed.token,
      },
    };
  } catch (error) {
    console.error("Account avatar prepare failed", error);
    return { ok: false, message: "The avatar upload could not be started." };
  }
}

export async function finalizeAccountAvatarUploadAction(
  input: unknown,
): Promise<AvatarActionResult<{ avatarUrl: string }>> {
  const parsed = z.object({ assetId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "This avatar upload is invalid." };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await avatarRpc<{
      asset_id: string;
      object_key: string;
    }[]>(supabase, "finalize_profile_avatar_upload", {
      requested_asset_id: parsed.data.assetId,
    });
    const finalized = data?.[0];
    if (error || !finalized) throw new Error(error?.message ?? "avatar_finalize_failed");

    const { data: signed, error: signedError } = await supabase.storage
      .from("room-media")
      .createSignedUrl(finalized.object_key, 60 * 30);
    if (signedError || !signed?.signedUrl) {
      throw new Error(signedError?.message ?? "avatar_read_failed");
    }

    revalidatePath("/account");
    revalidatePath("/rooms", "layout");
    return { ok: true, data: { avatarUrl: signed.signedUrl } };
  } catch (error) {
    console.error("Account avatar finalize failed", error);
    return { ok: false, message: "The avatar upload could not be completed." };
  }
}
