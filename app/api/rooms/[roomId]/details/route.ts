import { NextResponse } from "next/server";

import { parseRoomPublicId } from "@/core/domain/ids";
import { getBackendRoomSession } from "@/data/supabase/backend-room-session";

export async function GET(
  _request: Request,
  { params }: { readonly params: Promise<{ roomId: string }> },
) {
  const publicId = parseRoomPublicId((await params).roomId);
  if (!publicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = await getBackendRoomSession(publicId, { deferPhotos: true });
  if (!payload) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } });
}
