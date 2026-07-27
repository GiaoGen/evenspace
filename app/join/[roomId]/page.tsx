import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseRoomPublicId } from "@/core/domain/ids";
import { previewRoomInvite } from "@/data/supabase/room-invites";
import { createSupabaseServerClient } from "@/data/supabase/server-client";
import { JoinRoomFlow } from "@/features/join/components/join-room-flow";

export const metadata: Metadata = { title: "Private invitation", description: "Join a private EventSpace room.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function JoinRoomPage({ params, searchParams }: { readonly params: Promise<{ roomId: string }>; readonly searchParams: Promise<{ token?: string; code?: string }> }) {
  const publicId = parseRoomPublicId((await params).roomId);
  if (!publicId) notFound();
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : undefined;
  const code = typeof query.code === "string" ? query.code.toUpperCase() : undefined;
  let invite = null;
  try {
    invite = await previewRoomInvite({ publicId, token, code });
  } catch {
    invite = null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  return <JoinRoomFlow publicId={publicId} token={token} code={code} invite={invite} authenticated={Boolean(data?.claims?.sub)} />;
}
