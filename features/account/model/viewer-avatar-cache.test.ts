import { afterEach, describe, expect, it, vi } from "vitest";

import type { AssetReference } from "@/core/domain/asset";
import {
  hasFreshViewerAvatarValidation,
  markViewerAvatarValidated,
  readViewerAvatar,
  saveViewerAvatar,
} from "./viewer-avatar-cache";

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
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent,
  });
  return { dispatchEvent };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("viewer avatar cache", () => {
  it("stores a stable asset descriptor and avoids duplicate broadcasts", () => {
    const { dispatchEvent } = browserWindow();
    const asset: AssetReference = {
      id: "avatar-one",
      kind: "image",
      mimeType: "image/jpeg",
      byteSize: 128,
      remoteUrl: "https://example.test/avatar.jpg?token=one",
      revision: 2,
    };

    saveViewerAvatar("user-one", asset);
    saveViewerAvatar("user-one", { ...asset, remoteUrl: "https://example.test/avatar.jpg?token=two" });

    expect(readViewerAvatar("user-one")).toEqual({ ...asset, remoteUrl: undefined });
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it("expires background validation metadata", () => {
    browserWindow();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T10:00:00Z"));

    markViewerAvatarValidated("user-validation");
    expect(hasFreshViewerAvatarValidation("user-validation")).toBe(true);

    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(hasFreshViewerAvatarValidation("user-validation")).toBe(false);
  });
});
