import { z } from "zod";

const cloudUrlSchema = z
  .string()
  .trim()
  .url("must be a valid URL")
  .refine((value) => new URL(value).protocol === "https:", {
    message: "must use HTTPS",
  });

const publishableKeySchema = z
  .string()
  .trim()
  .regex(/^sb_publishable_[A-Za-z0-9_-]+$/, {
    message: "must be a modern sb_publishable_ key",
  });

const secretKeySchema = z
  .string()
  .trim()
  .regex(/^sb_secret_[A-Za-z0-9_-]+$/, {
    message: "must be a modern sb_secret_ key",
  });

const publicSupabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: cloudUrlSchema,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKeySchema,
});

const serverSupabaseEnvSchema = publicSupabaseEnvSchema.extend({
  SUPABASE_SECRET_KEY: secretKeySchema,
});

export type PublicSupabaseEnv = {
  url: string;
  publishableKey: string;
};

export type ServerSupabaseEnv = PublicSupabaseEnv & {
  secretKey: string;
};

export class SupabaseEnvironmentError extends Error {
  constructor(issues: z.core.$ZodIssue[]) {
    const details = issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");

    super(`Invalid Supabase environment: ${details}`);
    this.name = "SupabaseEnvironmentError";
  }
}

function parseWithSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new SupabaseEnvironmentError(result.error.issues);
  }

  return result.data;
}

export function parsePublicSupabaseEnv(input: {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}): PublicSupabaseEnv {
  const parsed = parseWithSchema(publicSupabaseEnvSchema, input);

  return {
    url: parsed.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function parseServerSupabaseEnv(input: {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
}): ServerSupabaseEnv {
  const parsed = parseWithSchema(serverSupabaseEnvSchema, input);

  return {
    url: parsed.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    secretKey: parsed.SUPABASE_SECRET_KEY,
  };
}

export function parseOptionalSupabaseSecret(
  secretKey: string | undefined,
): string | undefined {
  if (secretKey === undefined || secretKey.trim() === "") {
    return undefined;
  }

  return parseWithSchema(secretKeySchema, secretKey);
}
