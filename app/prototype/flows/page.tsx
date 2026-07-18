import type { Metadata } from "next";
import { FlowPrototype } from "./flows";

export const metadata: Metadata = {
  title: "EventSpace — Flow Prototype",
  description: "Static high-fidelity flow screens for EventSpace.",
};

export default function FlowPrototypePage() {
  return <FlowPrototype />;
}
