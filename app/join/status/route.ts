import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/data/supabase/server-client";

const querySchema = z.object({
  publicId: z.string().regex(/^room_[a-z0-9_]{3,40}$/),
  requestId: z.uuid(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    publicId: url.searchParams.get("publicId"),
    requestId: url.searchParams.get("requestId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ status: "unavailable" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_join_request_status", {
    requested_room_public_id: parsed.data.publicId,
    requested_request_id: parsed.data.requestId,
  });
  const status = data?.[0]?.request_status;
  if (error || !["pending", "approved", "rejected"].includes(status ?? "")) {
    return NextResponse.json({ status: "unavailable" }, { status: 404 });
  }

  return NextResponse.json(
    { status },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
