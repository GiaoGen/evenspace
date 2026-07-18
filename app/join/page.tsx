import type { Metadata } from "next";
import { JoinByCode } from "@/features/join/components/join-by-code";

export const metadata: Metadata = { title: "Enter an invite code · EventSpace", description: "Open a private EventSpace room invitation." };

export default function JoinByCodePage() {
  return <JoinByCode />;
}
