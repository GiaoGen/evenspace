"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createAuthCallbackUrl,
  parseAuthDestination,
  parseTrustedRequestOrigin,
} from "@/data/supabase/auth-redirect";
import { createSupabaseServerClient } from "@/data/supabase/server-client";
import { getEventSpaceAppOrigin } from "@/data/supabase/env-server";

const emailPasswordSchema = z.object({
  email: z.email().trim().max(254),
  password: z.string().min(1),
  next: z.string().max(2048).optional(),
});

const emailSignUpSchema = emailPasswordSchema.extend({
  password: z.string().min(8).max(72),
  confirmPassword: z.string().min(1),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
});

export type AuthActionState = {
  readonly status: "idle" | "sent" | "error";
  readonly message: string;
};

function displayNameFromEmail(email: string) {
  return email
    .split("@", 1)[0]
    ?.replace(/[._-]+/g, " ")
    .trim()
    .slice(0, 60) || "EventSpace member";
}

async function bootstrapCurrentIdentity(email: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("bootstrap_identity", {
    requested_display_name: displayNameFromEmail(email),
    requested_theme: "system",
  });

  if (error) {
    await supabase.auth.signOut({ scope: "local" });
    return false;
  }

  return true;
}

export async function signInWithEmailPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const input = emailPasswordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!input.success) {
    return {
      status: "error",
      message: "Enter a valid email and password.",
    };
  }

  const destination = parseAuthDestination(input.data.next);

  if (!destination.ok) {
    return {
      status: "error",
      message: "The requested sign-in destination is not available.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.data.email,
    password: input.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: "The email or password is incorrect.",
    };
  }

  if (!(await bootstrapCurrentIdentity(input.data.email))) {
    return {
      status: "error",
      message: "Unable to finish sign-in. Please try again.",
    };
  }

  redirect(destination.path);
}

export async function signUpWithEmailPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const input = emailSignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    next: formData.get("next") || undefined,
  });

  if (!input.success) {
    return {
      status: "error",
      message: "Enter a valid email and matching password.",
    };
  }

  const destination = parseAuthDestination(input.data.next);

  if (!destination.ok) {
    return {
      status: "error",
      message: "The requested sign-in destination is not available.",
    };
  }

  const requestHeaders = await headers();
  const configuredOrigin = getEventSpaceAppOrigin();
  if (!configuredOrigin && process.env.NODE_ENV === "production") {
    return {
      status: "error",
      message: "Sign-in is not configured for this deployment yet.",
    };
  }
  const origin = configuredOrigin ?? parseTrustedRequestOrigin(
    requestHeaders.get("origin"),
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    requestHeaders.get("x-forwarded-proto")?.split(",", 1)[0]?.trim() ?? null,
    requestHeaders.get("referer"),
  );

  if (!origin) {
    return {
      status: "error",
      message: "Unable to start sign-in from this origin.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.data.email,
    password: input.data.password,
    options: {
      emailRedirectTo: createAuthCallbackUrl(origin, destination.path),
    },
  });

  if (error) {
    return {
      status: "error",
      message: "Unable to create this account. Please try again.",
    };
  }

  if (data.session && !(await bootstrapCurrentIdentity(input.data.email))) {
    return {
      status: "error",
      message: "Unable to finish registration. Please try again.",
    };
  }

  if (data.session) {
    redirect(destination.path);
  }

  return {
    status: "sent",
    message: "Check your email for the verification link, then sign in.",
  };
}

export async function signOutCurrentSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });

  redirect("/");
}
