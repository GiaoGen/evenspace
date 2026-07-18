import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseRoomPublicId } from "@/core/domain/ids";
import { MockRoomRoute } from "@/features/room/components/mock-room-route";

interface RoomRouteProps {
  readonly params: Promise<{ roomId: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: RoomRouteProps): Promise<Metadata> {
  const value = (await params).roomId;
  const publicId = parseRoomPublicId(value);
  if (!publicId) return { title: "Room unavailable" };
  return { title: "Private room", robots: { index: false, follow: false } };
}

export default async function RoomRoute({ params }: RoomRouteProps) {
  const value = (await params).roomId;
  const publicId = parseRoomPublicId(value);
  if (!publicId) notFound();

  return <MockRoomRoute publicId={publicId} />;
}
