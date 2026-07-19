"use client";

import { useEffect, useRef, useState } from "react";
import type { ActorId } from "@/core/domain/ids";
import type { MockPoll } from "@/features/mock-session/model/mock-session";

export function useInlinePollVisibility(poll: MockPoll | null, viewerActorId: ActorId) {
  const pollId = poll?.id ?? null;
  const viewerVoted = Boolean(poll?.voterActorIds.includes(viewerActorId));
  const [visiblePollId, setVisiblePollId] = useState<string | null>(() => poll && !viewerVoted ? poll.id : null);
  const previousPollIdRef = useRef(pollId);
  const votedThisVisitRef = useRef(new Set<string>());

  useEffect(() => {
    const pollChanged = previousPollIdRef.current !== pollId;
    previousPollIdRef.current = pollId;
    const syncVisibility = () => setVisiblePollId((current) => {
      if (!pollId) return null;
      if (pollChanged) return viewerVoted ? null : pollId;
      if (!viewerVoted) return pollId;
      return votedThisVisitRef.current.has(pollId) ? current : null;
    });
    if (typeof queueMicrotask === "function") queueMicrotask(syncVisibility);
    else void Promise.resolve().then(syncVisibility);
  }, [pollId, viewerVoted]);

  function markVoteSubmitted(targetPollId: string) {
    votedThisVisitRef.current.add(targetPollId);
    setVisiblePollId(targetPollId);
  }

  return { showInlinePoll: Boolean(pollId && visiblePollId === pollId), markVoteSubmitted };
}
