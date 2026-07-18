import "server-only";

import { actorId } from "@/core/domain/ids";
import { MOCK_SESSION_VERSION, type MockSession } from "@/features/mock-session/model/mock-session";

export function getInitialMockSession(): MockSession {
  return {
    version: MOCK_SESSION_VERSION,
    sessionId: "eventspace_local_session",
    viewer: {
      actorId: actorId("actor_local_owner"),
      displayName: "You",
      initials: "Y",
      email: "local@eventspace.invalid",
      authState: "signed-in",
      theme: "system",
    },
    rooms: [],
  };
}
