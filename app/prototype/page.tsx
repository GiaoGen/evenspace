import type { Metadata } from "next";
import { Prototype } from "./prototype";

export const metadata: Metadata = {
  title: "EventSpace — Design Prototype",
  description: "A static visual prototype for EventSpace.",
};

export default function PrototypePage() {
  return <Prototype />;
}
