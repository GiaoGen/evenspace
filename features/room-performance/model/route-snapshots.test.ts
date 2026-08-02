import { afterEach, describe, expect, it, vi } from "vitest";

import {
  readRoomsRouteSnapshot,
  rememberViewerCacheScope,
  saveRoomsRouteSnapshot,
} from "./route-snapshots";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, value); },
  };
}

function browserWindow() {
  const dispatchEvent = vi.fn(() => true);
  vi.stubGlobal("window", {
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent,
  });
  return { dispatchEvent };
}

afterEach(() => vi.unstubAllGlobals());

describe("rooms route snapshot", () => {
  it("keeps a stable snapshot and does not broadcast unchanged content", () => {
    const { dispatchEvent } = browserWindow();
    rememberViewerCacheScope("actor-stable");

    saveRoomsRouteSnapshot({ scope: "actor-stable", viewerAccountScope: "user-stable", rooms: [], viewerInitials: "AS" });
    const first = readRoomsRouteSnapshot();
    saveRoomsRouteSnapshot({ scope: "actor-stable", viewerAccountScope: "user-stable", rooms: [], viewerInitials: "AS" });

    expect(readRoomsRouteSnapshot()).toBe(first);
    expect(first?.viewerAccountScope).toBe("user-stable");
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it("broadcasts when visible snapshot content changes", () => {
    const { dispatchEvent } = browserWindow();
    rememberViewerCacheScope("actor-updated");

    saveRoomsRouteSnapshot({ scope: "actor-updated", rooms: [], viewerInitials: "AU" });
    saveRoomsRouteSnapshot({ scope: "actor-updated", rooms: [], viewerInitials: "NEW" });

    expect(readRoomsRouteSnapshot()?.viewerInitials).toBe("NEW");
    expect(dispatchEvent).toHaveBeenCalledTimes(2);
  });

  it("broadcasts when the account cache scope changes", () => {
    const { dispatchEvent } = browserWindow();
    rememberViewerCacheScope("actor-account");

    saveRoomsRouteSnapshot({ scope: "actor-account", viewerAccountScope: "user-before", rooms: [], viewerInitials: "AA" });
    saveRoomsRouteSnapshot({ scope: "actor-account", viewerAccountScope: "user-after", rooms: [], viewerInitials: "AA" });

    expect(readRoomsRouteSnapshot()?.viewerAccountScope).toBe("user-after");
    expect(dispatchEvent).toHaveBeenCalledTimes(2);
  });
});
