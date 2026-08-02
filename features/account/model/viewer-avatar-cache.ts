"use client";

import type { AssetReference } from "@/core/domain/asset";

const PREFIX = "eventspace:viewer-avatar:v1:";
const VALIDATED_PREFIX = "eventspace:viewer-avatar-validated:v1:";
const CHANGE_EVENT = "eventspace:viewer-avatar-change";
const VALIDATION_MAX_AGE_MS = 1000 * 60 * 10;
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
      const changed = window.localStorage.getItem(`${PREFIX}${scope}`) !== raw;
      if (changed) window.localStorage.setItem(`${PREFIX}${scope}`, raw);
      memo.set(scope, { raw, asset: stable });
      if (!changed) return;
    } else {
      const changed = window.localStorage.getItem(`${PREFIX}${scope}`) !== null;
      if (changed) window.localStorage.removeItem(`${PREFIX}${scope}`);
      memo.set(scope, { raw: null, asset: null });
      if (!changed) return;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Avatar caching is optional.
  }
}

export function clearViewerAvatar(scope: string) {
  if (typeof window === "undefined" || !scope) return;
  try {
    const changed = window.localStorage.getItem(`${PREFIX}${scope}`) !== null;
    if (changed) window.localStorage.removeItem(`${PREFIX}${scope}`);
    memo.set(scope, { raw: null, asset: null });
    if (changed) window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  catch { /* Cleanup must not block sign out. */ }
}

export function hasFreshViewerAvatarValidation(scope: string) {
  if (typeof window === "undefined" || !scope) return false;
  try {
    const checkedAt = Number(window.localStorage.getItem(`${VALIDATED_PREFIX}${scope}`));
    return Number.isFinite(checkedAt) && checkedAt > 0 && Date.now() - checkedAt < VALIDATION_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function markViewerAvatarValidated(scope: string) {
  if (typeof window === "undefined" || !scope) return;
  try { window.localStorage.setItem(`${VALIDATED_PREFIX}${scope}`, String(Date.now())); }
  catch { /* Validation metadata is optional. */ }
}
