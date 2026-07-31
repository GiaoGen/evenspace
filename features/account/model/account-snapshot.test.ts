import { afterEach, describe, expect, it, vi } from "vitest";

import type { BackendAccount } from "@/data/supabase/backend-account";
import {
  readAccountSnapshot,
  rememberAccountCacheScope,
  saveAccountSnapshot,
} from "./account-snapshot";

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

function account(scope: string, theme: BackendAccount["viewer"]["theme"] = "system"): BackendAccount {
  return {
    cacheScope: scope,
    viewer: {
      actorId: "21000000-0000-4000-8000-000000000001" as never,
      displayName: "Account User",
      initials: "AU",
      avatarUrl: null,
      email: "account@example.com",
      authState: "signed-in",
      theme,
    },
    summary: { activeRooms: 1, memories: 2, boardItems: 3, storedRooms: 3 },
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

describe("account snapshot", () => {
  it("does not broadcast when the stable account content is unchanged", () => {
    const { dispatchEvent } = browserWindow();
    const value = account("user-deduplicated");
    rememberAccountCacheScope(value.cacheScope);

    saveAccountSnapshot(value);
    saveAccountSnapshot({ ...value, viewer: { ...value.viewer } });

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(readAccountSnapshot()?.account).toEqual(value);
  });

  it("broadcasts when account content actually changes", () => {
    const { dispatchEvent } = browserWindow();
    const scope = "user-updated";
    rememberAccountCacheScope(scope);

    saveAccountSnapshot(account(scope, "light"));
    saveAccountSnapshot(account(scope, "dark"));

    expect(dispatchEvent).toHaveBeenCalledTimes(2);
    expect(readAccountSnapshot()?.account.viewer.theme).toBe("dark");
  });
});
