import type { Metadata } from "next";
import { parseRoomPublicId } from "@/core/domain/ids";
import { getBackendRoomSession } from "@/data/supabase/backend-room-session";
import { BackendRoomRoute } from "@/features/room/components/backend-room-route";

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
  const payload = publicId ? await getBackendRoomSession(publicId, { deferSecondary: true }) : null;

  return <BackendRoomRoute payload={payload} />;
}
