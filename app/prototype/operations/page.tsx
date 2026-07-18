import type { Metadata } from "next";
import { OperationsPrototype } from "./operations";

export const metadata: Metadata = {
  title: "EventSpace — Operations Prototype",
  description: "Static high-fidelity operational screens for EventSpace.",
};

export default function OperationsPrototypePage() {
  return <OperationsPrototype />;
}
