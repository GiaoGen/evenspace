"use client";

import { useEffect, useState } from "react";
import type { MockPoll } from "@/features/mock-session/model/mock-session";

export function usePollClock(poll: MockPoll | null) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!poll || poll.resolvedChoiceId) return;
    const delay = Math.max(0, Math.min(2_147_000_000, Date.parse(poll.closesAt) - Date.now() + 20));
    const timer = window.setTimeout(() => setNowMs(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [poll]);

  return nowMs;
}
