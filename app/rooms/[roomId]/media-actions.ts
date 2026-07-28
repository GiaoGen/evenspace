"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/data/supabase/database.types";
import { getServerSupabaseEnv } from "@/data/supabase/env-server";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

const roomPublicId = z.string().regex(/^room_[a-z0-9_]{3,40}$/);
const uuid = z.uuid();
const imageMime = z.enum(["image/jpeg", "image/png", "image/webp"]);
const voiceMime = z.enum(["audio/webm", "audio/ogg", "audio/mp4"]);

type ActionResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly message: string };
type MediaRpcResult<T> = { data: T | null; error: { message: string } | null };

function mediaRpc<T>(client: Awaited<ReturnType<typeof createSupabaseServerClient>>, name: string, args: Record<string, unknown>) {
  return (client.rpc as unknown as (rpcName: string, rpcArgs: Record<string, unknown>) => Promise<MediaRpcResult<T>>)(name, args);
}

function failure(error: unknown): ActionResult<never> {
  console.error("Room media action failed", error);
  const message = error instanceof Error ? error.message : "Media is unavailable right now.";
  if (message === "photo_limit_reached") return { ok: false, message: "This room has reached its photo limit." };
  if (message.includes("SUPABASE_SECRET_KEY")) return { ok: false, message: "Media uploads are not configured for this environment yet." };
  return { ok: false, message: "Media is unavailable right now." };
}

function createStorageSigningClient() {
  const { url, secretKey } = getServerSupabaseEnv();
  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function prepareRoomMediaUploadAction(input: unknown): Promise<ActionResult<{ assetId: string; objectKey: string; token: string }>> {
  const parsed = z.object({
    roomPublicId,
    kind: z.enum(["image", "voice"]),
    mimeType: z.string(),
    byteSize: z.number().int().positive(),
    durationMs: z.number().int().positive().max(60_000).optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "This media file is not supported." };
  if (parsed.data.kind === "image" ? !imageMime.safeParse(parsed.data.mimeType).success : !voiceMime.safeParse(parsed.data.mimeType).success) {
    return { ok: false, message: "This media format is not supported." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await mediaRpc<{ asset_id: string; object_key: string }[]>(supabase, "prepare_room_media_upload", {
      requested_room_public_id: parsed.data.roomPublicId,
      requested_kind: parsed.data.kind,
      requested_mime_type: parsed.data.mimeType,
      requested_byte_size: parsed.data.byteSize,
      requested_duration_ms: parsed.data.durationMs ?? null,
    });
    if (error || !data?.[0]) throw new Error(error?.message ?? "media_prepare_failed");
    const prepared = data[0];
    // The caller has already been authorized by prepare_room_media_upload. Use
    // the server-only secret only to mint a short-lived, object-specific upload
    // token; no privileged credential reaches the browser.
    const { data: signed, error: signedError } = await createStorageSigningClient()
      .storage.from("room-media").createSignedUploadUrl(prepared.object_key);
    if (signedError || !signed?.token) throw new Error(signedError?.message ?? "media_upload_url_failed");
    return { ok: true, data: { assetId: prepared.asset_id, objectKey: prepared.object_key, token: signed.token } };
  } catch (error) { return failure(error); }
}

export async function finalizeRoomMediaUploadAction(input: unknown): Promise<ActionResult<{ id: string; kind: "image" | "audio"; mimeType: string; byteSize: number; durationSeconds: number; signedUrl: string }>> {
  const parsed = z.object({ assetId: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "This upload is invalid." };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await mediaRpc<{ asset_id: string; object_key: string; kind: string; mime_type: string; byte_size: number; duration_ms: number | null }[]>(supabase, "finalize_room_media_upload", { requested_asset_id: parsed.data.assetId });
    if (error || !data?.[0]) throw new Error(error?.message ?? "media_finalize_failed");
    const asset = data[0];
    const { data: signed, error: signedError } = await supabase.storage.from("room-media").createSignedUrl(asset.object_key, 60 * 30);
    if (signedError || !signed?.signedUrl) throw new Error(signedError?.message ?? "media_read_url_failed");
    return {
      ok: true,
      data: {
        id: asset.asset_id,
        kind: asset.kind === "voice" ? "audio" : "image",
        mimeType: asset.mime_type,
        byteSize: asset.byte_size,
        durationSeconds: Math.max(1, Math.round((asset.duration_ms ?? 0) / 1000)),
        signedUrl: signed.signedUrl,
      },
    };
  } catch (error) { return failure(error); }
}

export async function createRoomPhotoAction(input: unknown): Promise<ActionResult<{ photoId: string }>> {
  const parsed = z.object({ roomPublicId, assetId: uuid, originalName: z.string().trim().min(1).max(120), aspectRatio: z.number().finite().min(0.1).max(10) }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "This photo is invalid." };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await mediaRpc<{ photo_id: string }[]>(supabase, "create_room_photo", {
      requested_room_public_id: parsed.data.roomPublicId,
      requested_asset_id: parsed.data.assetId,
      requested_original_name: parsed.data.originalName,
      requested_aspect_ratio: parsed.data.aspectRatio,
    });
    if (error || !data?.[0]) throw new Error(error?.message ?? "photo_create_failed");
    return { ok: true, data: { photoId: data[0].photo_id } };
  } catch (error) { return failure(error); }
}

export async function addPhotoCommentAction(input: unknown): Promise<ActionResult<{ commentId: string }>> {
  const parsed = z.object({ photoId: uuid, body: z.string().trim().min(1).max(1000) }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Write a shorter comment." };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await mediaRpc<{ comment_id: string }[]>(supabase, "add_photo_comment", { requested_photo_id: parsed.data.photoId, requested_body: parsed.data.body });
    if (error || !data?.[0]) throw new Error(error?.message ?? "photo_comment_failed");
    return { ok: true, data: { commentId: data[0].comment_id } };
  } catch (error) { return failure(error); }
}

export async function deleteRoomPhotoAction(input: unknown): Promise<ActionResult<{ photoId: string }>> {
  const parsed = z.object({ photoId: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "This photo is invalid." };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await mediaRpc<{ photo_id: string }[]>(supabase, "delete_room_photo", { requested_photo_id: parsed.data.photoId });
    if (error || !data?.[0]) throw new Error(error?.message ?? "photo_delete_failed");
    return { ok: true, data: { photoId: data[0].photo_id } };
  } catch (error) { return failure(error); }
}
