"use client";

import type { BackendAccount } from "@/data/supabase/backend-account";

const ACCOUNT_SCOPE_KEY = "eventspace:account-cache-scope:v1";
const ACCOUNT_SNAPSHOT_KEY = "eventspace:account-snapshot:v1";
const ACCOUNT_SNAPSHOT_EVENT = "eventspace:account-snapshot-change";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export interface AccountSnapshot {
  readonly version: 1;
  readonly scope: string;
  readonly savedAt: number;
  readonly account: BackendAccount;
}

let memoizedRaw: string | null | undefined;
let memoizedSnapshot: AccountSnapshot | null = null;
let memoizedScope: string | null | undefined;

function storage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function currentScope() {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage.getItem(ACCOUNT_SCOPE_KEY); }
  catch { return null; }
}

function withoutSignedUrls(account: BackendAccount): BackendAccount {
  const avatarAsset = account.viewer.avatarAsset
    ? { ...account.viewer.avatarAsset, remoteUrl: undefined }
    : account.viewer.avatarAsset;
  return {
    ...account,
    viewer: { ...account.viewer, avatarUrl: null, avatarAsset },
  };
}

export function rememberAccountCacheScope(scope: string | undefined) {
  if (!scope || typeof window === "undefined") return;
  try { window.sessionStorage.setItem(ACCOUNT_SCOPE_KEY, scope); }
  catch { /* Account acceleration is optional. */ }
}

export function readAccountSnapshot(): AccountSnapshot | null {
  const local = storage();
  if (!local) return null;
  try {
    const raw = local.getItem(ACCOUNT_SNAPSHOT_KEY);
    const scope = currentScope();
    if (raw === memoizedRaw && scope === memoizedScope) return memoizedSnapshot;
    memoizedRaw = raw;
    memoizedScope = scope;
    const parsed = raw ? JSON.parse(raw) as AccountSnapshot : null;
    memoizedSnapshot = parsed
      && parsed.version === 1
      && parsed.scope === scope
      && Number.isFinite(parsed.savedAt)
      && Date.now() - parsed.savedAt < MAX_AGE_MS
      ? parsed
      : null;
    return memoizedSnapshot;
  } catch {
    memoizedRaw = undefined;
    memoizedScope = undefined;
    memoizedSnapshot = null;
    return null;
  }
}

export function subscribeAccountSnapshot(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === ACCOUNT_SNAPSHOT_KEY) onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(ACCOUNT_SNAPSHOT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ACCOUNT_SNAPSHOT_EVENT, onChange);
  };
}

export function saveAccountSnapshot(account: BackendAccount) {
  const local = storage();
  if (!local || !account.cacheScope) return;
  try {
    const stableAccount = withoutSignedUrls(account);
    const current = readAccountSnapshot();
    if (
      current?.scope === account.cacheScope
      && JSON.stringify(current.account) === JSON.stringify(stableAccount)
    ) return;
    const snapshot: AccountSnapshot = {
      version: 1,
      scope: account.cacheScope,
      savedAt: Date.now(),
      account: stableAccount,
    };
    const raw = JSON.stringify(snapshot);
    local.setItem(ACCOUNT_SNAPSHOT_KEY, raw);
    memoizedRaw = raw;
    memoizedScope = account.cacheScope;
    memoizedSnapshot = snapshot;
    window.dispatchEvent(new Event(ACCOUNT_SNAPSHOT_EVENT));
  } catch {
    // Storage quota must never prevent account updates.
  }
}

export function clearAccountSnapshot() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACCOUNT_SNAPSHOT_KEY);
    window.sessionStorage.removeItem(ACCOUNT_SCOPE_KEY);
    memoizedRaw = null;
    memoizedScope = null;
    memoizedSnapshot = null;
    window.dispatchEvent(new Event(ACCOUNT_SNAPSHOT_EVENT));
  } catch {
    // Cleanup must never block sign out.
  }
}
