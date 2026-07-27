import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/data/supabase/server-client";

const publicIdSchema = z.string().regex(/^room_[a-z0-9_]{3,40}$/);
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const codeSchema = z.string().regex(/^[A-Z0-9]{8}$/);

const invitePreviewSchema = z.object({
  room_id: z.uuid(),
  public_id: publicIdSchema,
  name: z.string(),
  description: z.string(),
  ends_at: z.iso.datetime({ offset: true }),
  time_zone: z.string(),
  requires_approval: z.boolean(),
  member_limit: z.number().int(),
  member_count: z.number().int().nonnegative(),
  invite_revision: z.number().int().positive(),
});

const createInviteResultSchema = z.object({
  room_id: z.uuid(),
  public_id: publicIdSchema,
  invite_revision: z.number().int().positive(),
});

const joinResultSchema = z.object({
  outcome: z.enum(["pending", "joined"]),
  room_id: z.uuid(),
  public_id: publicIdSchema,
  actor_id: z.uuid(),
  request_id: z.uuid().nullable(),
});

export type RoomInvitePreview = z.infer<typeof invitePreviewSchema>;
export type JoinRoomResult = z.infer<typeof joinResultSchema>;

export type RoomInviteErrorCode =
  | "invalid_input"
  | "authentication_required"
  | "identity_required"
  | "host_required"
  | "invalid_or_expired"
  | "capacity_reached"
  | "nickname_unavailable"
  | "access_denied"
  | "unavailable";

export class RoomInviteError extends Error {
  readonly code: RoomInviteErrorCode;

  constructor(code: RoomInviteErrorCode) {
    super(code);
    this.name = "RoomInviteError";
    this.code = code;
  }
}

type RpcError = { readonly code?: string; readonly message?: string };

function mapRpcError(error: RpcError) {
  if (error.message === "authentication_required") return new RoomInviteError("authentication_required");
  if (error.message === "identity_bootstrap_required" || error.code === "P0002") return new RoomInviteError("identity_required");
  if (error.message === "host_permission_required") return new RoomInviteError("host_required");
  if (error.message === "invalid_or_expired_invite") return new RoomInviteError("invalid_or_expired");
  if (error.message === "room_capacity_reached") return new RoomInviteError("capacity_reached");
  if (error.message === "nickname_unavailable" || error.code === "23505") return new RoomInviteError("nickname_unavailable");
  if (error.message === "room_access_denied") return new RoomInviteError("access_denied");
  if (error.code === "22023") return new RoomInviteError("invalid_input");
  return new RoomInviteError("unavailable");
}

function first<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(Array.isArray(data) ? data[0] : undefined);
  if (!parsed.success) throw new RoomInviteError("unavailable");
  return parsed.data;
}

function optionalFirst<T>(schema: z.ZodType<T>, data: unknown): T | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  return first(schema, data);
}

export async function createRoomInvite(input: {
  readonly publicId: string;
  readonly token: string;
  readonly code: string;
}) {
  const parsed = z.object({ publicId: publicIdSchema, token: tokenSchema, code: codeSchema }).safeParse(input);
  if (!parsed.success) throw new RoomInviteError("invalid_input");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_room_invite", {
    requested_room_public_id: parsed.data.publicId,
    requested_token: parsed.data.token,
    requested_code: parsed.data.code,
  });
  if (error) throw mapRpcError(error);
  return first(createInviteResultSchema, data);
}

export async function previewRoomInvite(input: {
  readonly publicId: string;
  readonly token?: string;
  readonly code?: string;
}): Promise<RoomInvitePreview | null> {
  const parsed = z.object({
    publicId: publicIdSchema,
    token: tokenSchema.optional(),
    code: codeSchema.optional(),
  }).refine((value) => Number(Boolean(value.token)) + Number(Boolean(value.code)) === 1).safeParse(input);
  if (!parsed.success) throw new RoomInviteError("invalid_input");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("preview_room_invite", {
    requested_room_public_id: parsed.data.publicId,
    requested_token: parsed.data.token,
    requested_code: parsed.data.code,
  });
  if (error) throw mapRpcError(error);
  return optionalFirst(invitePreviewSchema, data);
}

export async function resolveRoomInviteCode(code: string): Promise<RoomInvitePreview | null> {
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) throw new RoomInviteError("invalid_input");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("resolve_room_invite_code", {
    requested_code: parsed.data,
  });
  if (error) throw mapRpcError(error);
  return optionalFirst(invitePreviewSchema, data);
}

export async function joinRoomWithInvite(input: {
  readonly publicId: string;
  readonly nickname: string;
  readonly note?: string;
  readonly token?: string;
  readonly code?: string;
}): Promise<JoinRoomResult> {
  const parsed = z.object({
    publicId: publicIdSchema,
    nickname: z.string().trim().min(1).max(60),
    note: z.string().trim().max(240).optional().default(""),
    token: tokenSchema.optional(),
    code: codeSchema.optional(),
  }).refine((value) => Number(Boolean(value.token)) + Number(Boolean(value.code)) === 1).safeParse(input);
  if (!parsed.success) throw new RoomInviteError("invalid_input");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("join_room_with_invite", {
    requested_room_public_id: parsed.data.publicId,
    requested_nickname: parsed.data.nickname,
    requested_note: parsed.data.note,
    requested_token: parsed.data.token,
    requested_code: parsed.data.code,
  });
  if (error) throw mapRpcError(error);
  return first(joinResultSchema, data);
}
