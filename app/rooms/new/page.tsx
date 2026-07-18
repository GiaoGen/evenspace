import type { Metadata } from "next";
import { CreateRoomWizard } from "@/features/create-room/components/create-room-wizard";

export const metadata: Metadata = {
  title: "Create a room",
  description: "Create a private temporary EventSpace room.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function CreateRoomRoute() {
  return <CreateRoomWizard />;
}
