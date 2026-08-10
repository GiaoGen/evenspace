import type { Metadata } from "next";
import { ZineCreator } from "@/features/zine/components/zine-creator";

export const metadata: Metadata = {
  title: "Create a zine",
  description: "Shape photos and notes into an EventSpace zine.",
};

export default function ZinePage() {
  return <ZineCreator />;
}
