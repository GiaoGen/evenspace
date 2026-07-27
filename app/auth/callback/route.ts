import { NextResponse, type NextRequest } from "next/server";

import { parseAuthDestination } from "@/data/supabase/auth-redirect";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
} as const;

function callbackError() {
  return NextResponse.json(
    { error: "Unable to complete sign-in." },
    {
      status: 400,
      headers: NO_STORE_HEADERS,
    },
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = parseAuthDestination(
    request.nextUrl.searchParams.get("next"),
  );

  if (!code || !destination.ok) {
    return callbackError();
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return callbackError();
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  const emailName = user?.email
    ?.split("@", 1)[0]
    ?.replace(/[._-]+/g, " ")
    .trim();
  const displayName = emailName?.slice(0, 60) || "EventSpace member";

  if (userError || !user) {
    await supabase.auth.signOut({ scope: "local" });
    return callbackError();
  }

  const { error: bootstrapError } = await supabase.rpc("bootstrap_identity", {
    requested_display_name: displayName,
    requested_theme: "system",
  });

  if (bootstrapError) {
    await supabase.auth.signOut({ scope: "local" });
    return callbackError();
  }

  const response = NextResponse.redirect(
    new URL(destination.path, request.nextUrl.origin),
    303,
  );

  Object.entries(NO_STORE_HEADERS).forEach(([name, value]) => {
    response.headers.set(name, value);
  });

  return response;
}
