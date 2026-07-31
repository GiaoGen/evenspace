import { NextResponse } from "next/server";

import { getBackendAccount } from "@/data/supabase/backend-account";

export async function GET() {
  const account = await getBackendAccount();
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(account, { headers: { "Cache-Control": "private, no-store" } });
}
