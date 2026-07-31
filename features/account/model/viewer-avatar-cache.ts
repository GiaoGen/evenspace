"use client";

import type { AssetReference } from "@/core/domain/asset";

const PREFIX = "eventspace:viewer-avatar:v1:";
const CHANGE_EVENT = "eventspace:viewer-avatar-change";
const memo = new Map<string, { readonly raw: string | null; readonly asset: AssetReference | null }>();

function withoutRemoteUrl(asset: AssetReference): AssetReference {
  return { ...asset, remoteUrl: undefined };
}

export function readViewerAvatar(scope: string): AssetReference | null {
  if (typeof window === "undefined" || !scope) return null;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${scope}`);
    const cached = memo.get(scope);
    if (cached?.raw === raw) return cached.asset;
    const asset = raw ? JSON.parse(raw) as AssetReference : null;
    memo.set(scope, { raw, asset });
    return asset;
  } catch {
    return null;
  }
}

export function subscribeViewerAvatar(scope: string | undefined, onChange: () => void) {
  if (typeof window === "undefined" || !scope) return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === `${PREFIX}${scope}`) onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function saveViewerAvatar(scope: string, asset: AssetReference | null) {
  if (typeof window === "undefined" || !scope) return;
  try {
    if (asset) {
      const stable = withoutRemoteUrl(asset);
      const raw = JSON.stringify(stable);
      window.localStorage.setItem(`${PREFIX}${scope}`, raw);
      memo.set(scope, { raw, asset: stable });
    } else {
      window.localStorage.removeItem(`${PREFIX}${scope}`);
      memo.set(scope, { raw: null, asset: null });
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Avatar caching is optional.
  }
}

export function clearViewerAvatar(scope: string) {
  if (typeof window === "undefined" || !scope) return;
  try {
    window.localStorage.removeItem(`${PREFIX}${scope}`);
    memo.set(scope, { raw: null, asset: null });
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  catch { /* Cleanup must not block sign out. */ }
}
