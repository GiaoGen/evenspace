import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/data/supabase/server-client";

const themeSchema = z.enum(["system", "light", "dark"]);

const bootstrapIdentityInputSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  theme: themeSchema.optional().default("system"),
});

const createHostLedRoomInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500),
  timeZone: z.string().trim().min(1).max(64),
  durationMinutes: z.number().int().min(15).max(1440),
  memberLimit: z.number().int().min(2).max(10),
  requiresApproval: z.boolean(),
  idempotencyKey: z.uuid(),
});

const bootstrapIdentityResultSchema = z.object({
  profile_user_id: z.uuid(),
  actor_id: z.uuid(),
  actor_kind: z.enum(["guest", "account"]),
  display_name: z.string(),
  theme: themeSchema,
  is_anonymous: z.boolean(),
});

const createHostLedRoomResultSchema = z.object({
  room_id: z.uuid(),
  public_id: z.string().min(1),
  actor_id: z.uuid(),
  created: z.boolean(),
});

export type BootstrapIdentityInput = z.input<
  typeof bootstrapIdentityInputSchema
>;
export type BootstrapIdentityResult = z.infer<
  typeof bootstrapIdentityResultSchema
>;
export type CreateHostLedRoomInput = z.input<
  typeof createHostLedRoomInputSchema
>;
export type CreateHostLedRoomResult = z.infer<
  typeof createHostLedRoomResultSchema
>;

export type BackendCommandErrorCode =
  | "invalid_input"
  | "authentication_required"
  | "permanent_account_required"
  | "identity_bootstrap_required"
  | "command_unavailable";

const safeMessages: Record<BackendCommandErrorCode, string> = {
  invalid_input: "The command input is invalid.",
  authentication_required: "Sign in to continue.",
  permanent_account_required: "A permanent account is required.",
  identity_bootstrap_required: "Finish setting up your account first.",
  command_unavailable: "The command is temporarily unavailable.",
};

export class BackendCommandError extends Error {
  readonly code: BackendCommandErrorCode;

  constructor(code: BackendCommandErrorCode) {
    super(safeMessages[code]);
    this.name = "BackendCommandError";
    this.code = code;
  }
}

type RpcError = {
  readonly code?: string;
  readonly message?: string;
};

function mapRpcError(error: RpcError): BackendCommandError {
  if (error.message === "permanent_account_required") {
    return new BackendCommandError("permanent_account_required");
  }

  if (error.message === "identity_bootstrap_required" || error.code === "P0002") {
    return new BackendCommandError("identity_bootstrap_required");
  }

  if (error.message === "authentication_required" || error.code === "42501") {
    return new BackendCommandError("authentication_required");
  }

  if (error.code === "22023") {
    return new BackendCommandError("invalid_input");
  }

  return new BackendCommandError("command_unavailable");
}

function parseInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new BackendCommandError("invalid_input");
  }

  return result.data;
}

function parseRpcResult<TSchema extends z.ZodType>(
  schema: TSchema,
  data: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(Array.isArray(data) ? data[0] : undefined);

  if (!result.success) {
    throw new BackendCommandError("command_unavailable");
  }

  return result.data;
}

/**
 * Idempotently creates or upgrades the current Auth user's profile and stable
 * primary actor. This is a server-only command boundary; it does not wire any
 * existing page or Mock data flow to Supabase.
 */
export async function bootstrapCurrentIdentity(
  input: BootstrapIdentityInput,
): Promise<BootstrapIdentityResult> {
  const parsed = parseInput(bootstrapIdentityInputSchema, input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("bootstrap_identity", {
    requested_display_name: parsed.displayName,
    requested_theme: parsed.theme,
  });

  if (error) {
    throw mapRpcError(error);
  }

  return parseRpcResult(bootstrapIdentityResultSchema, data);
}

/**
 * Creates a Host-led room and its Host membership in one database transaction.
 * The caller supplies only user-editable fields plus an idempotency UUID.
 */
export async function createHostLedRoom(
  input: CreateHostLedRoomInput,
): Promise<CreateHostLedRoomResult> {
  const parsed = parseInput(createHostLedRoomInputSchema, input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_host_led_room", {
    requested_name: parsed.name,
    requested_description: parsed.description,
    requested_time_zone: parsed.timeZone,
    requested_duration_minutes: parsed.durationMinutes,
    requested_member_limit: parsed.memberLimit,
    requested_requires_approval: parsed.requiresApproval,
    requested_idempotency_key: parsed.idempotencyKey,
  });

  if (error) {
    throw mapRpcError(error);
  }

  return parseRpcResult(createHostLedRoomResultSchema, data);
}
