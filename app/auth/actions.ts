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

const emailSignInSchema = z.object({
  email: z.email().trim().max(254),
  next: z.string().max(2048).optional(),
});

export type EmailSignInState = {
  readonly status: "idle" | "sent" | "error";
  readonly message: string;
};

export async function requestEmailSignIn(
  _previousState: EmailSignInState,
  formData: FormData,
): Promise<EmailSignInState> {
  const input = emailSignInSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined,
  });

  if (!input.success) {
    return {
      status: "error",
      message: "Enter a valid email address.",
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
  const origin = parseTrustedRequestOrigin(
    requestHeaders.get("origin"),
    requestHeaders.get("host") ?? requestHeaders.get("x-forwarded-host"),
    requestHeaders.get("x-forwarded-proto"),
    requestHeaders.get("referer"),
  );

  if (!origin) {
    return {
      status: "error",
      message: "Unable to start sign-in from this origin.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: input.data.email,
    options: {
      emailRedirectTo: createAuthCallbackUrl(origin, destination.path),
      shouldCreateUser: true,
    },
  });

  if (error) {
    return {
      status: "error",
      message: "Unable to send a sign-in email. Please try again.",
    };
  }

  return {
    status: "sent",
    message: "Check your email for a secure sign-in link.",
  };
}

export async function signOutCurrentSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });

  redirect("/");
}
