import type { Metadata } from "next";
import { RoomsPage } from "@/features/rooms/components/rooms-page";

export const metadata: Metadata = {
  title: "Your rooms",
  description: "Your active and archived EventSpace rooms.",
};

export const dynamic = "force-dynamic";

export default function RoomsRoute() {
  return <RoomsPage />;
}
