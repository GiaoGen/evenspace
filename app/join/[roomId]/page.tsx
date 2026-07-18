import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseRoomPublicId } from "@/core/domain/ids";
import { JoinRoomFlow } from "@/features/join/components/join-room-flow";

export const metadata: Metadata = { title: "Private invitation", description: "Join a private EventSpace room.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function JoinRoomPage({ params, searchParams }: { readonly params: Promise<{ roomId: string }>; readonly searchParams: Promise<{ revision?: string }> }) {
  const publicId = parseRoomPublicId((await params).roomId);
  if (!publicId) notFound();
  const revision = Number((await searchParams).revision ?? "1");
  return <JoinRoomFlow publicId={publicId} inviteRevision={Number.isInteger(revision) ? revision : 1} />;
}
