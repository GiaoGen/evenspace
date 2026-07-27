"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type ReactNode } from "react";
import { mockSessionReducer, parsePersistedMockSession, type MockCommand, type MockSession, type MockSessionAction } from "../model/mock-session";
import { collectAssetIds } from "@/features/local-assets/model/asset-references";
import { clearLocalAssets, pruneLocalAssets } from "@/features/local-assets/model/local-asset-repository";
import { migratePersistedLocalAssets } from "@/features/local-assets/model/migrate-local-assets";

const STORAGE_KEY = "eventspace:local-session:v1";
const LEGACY_STORAGE_KEY = "eventspace:mock-session:v3";

interface MockSessionContextValue {
  readonly session: MockSession;
  readonly dispatch: Dispatch<MockSessionAction>;
  readonly reset: () => void;
}

const MockSessionContext = createContext<MockSessionContextValue | null>(null);

function readStoredSession() {
  try { return window.localStorage.getItem(STORAGE_KEY) ?? window.sessionStorage.getItem(LEGACY_STORAGE_KEY); }
  catch { return null; }
}

function writeStoredSession(session: MockSession) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch { /* Safari private mode or quota failure: keep the in-memory local state usable. */ }
}

function runAfterHydration(callback: () => void) {
  if (typeof queueMicrotask === "function") queueMicrotask(callback);
  else void Promise.resolve().then(callback);
}

export function MockSessionProvider({ initialSession, children }: { readonly initialSession: MockSession; readonly children: ReactNode }) {
  const [session, dispatch] = useReducer(mockSessionReducer, initialSession);
  const storageReady = useRef(false);

  useEffect(() => {
    if (storageReady.current) return;
    let active = true;
    const stored = readStoredSession();
    void (async () => {
      let restored: MockSession | null = null;
      try { restored = stored ? parsePersistedMockSession(await migratePersistedLocalAssets(stored)) : null; }
      catch { restored = null; }
      if (!active) return;
      runAfterHydration(() => {
        if (!active) return;
        if (restored) dispatch({ type: "HYDRATE", session: restored });
        else if (!stored) writeStoredSession(initialSession);
        storageReady.current = true;
      });
    })();
    return () => { active = false; };
  }, [initialSession]);

  useEffect(() => {
    if (storageReady.current) {
      writeStoredSession(session);
      void pruneLocalAssets(collectAssetIds(session)).catch(() => undefined);
    }
  }, [session]);

  useEffect(() => {
    document.documentElement.dataset.theme = session.viewer.theme;
    return () => { delete document.documentElement.dataset.theme; };
  }, [session.viewer.theme]);

  const value = useMemo<MockSessionContextValue>(() => ({ session, dispatch, reset: () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch { /* In-memory reset still succeeds. */ }
    void clearLocalAssets().catch(() => undefined);
    dispatch({ type: "RESET", session: initialSession });
  } }), [initialSession, session]);

  return <MockSessionContext.Provider value={value}>{children}</MockSessionContext.Provider>;
}

/**
 * Supplies the existing room UI with a server-backed session snapshot.
 *
 * This deliberately shares the same context contract as the local provider so
 * RoomExperience and its visual children do not need backend-specific markup.
 */
export function BackendSessionProvider({
  initialSession,
  children,
  onCommand,
  onSettled,
}: {
  readonly initialSession: MockSession;
  readonly children: ReactNode;
  readonly onCommand: (command: MockCommand) => Promise<void>;
  readonly onSettled: () => void;
}) {
  const [session, baseDispatch] = useReducer(mockSessionReducer, initialSession);

  useEffect(() => {
    baseDispatch({ type: "HYDRATE", session: initialSession });
  }, [initialSession]);

  const dispatch = useCallback<Dispatch<MockSessionAction>>((action) => {
    baseDispatch(action);
    if (action.type !== "COMMAND") return;
    void onCommand(action.command).finally(onSettled);
  }, [onCommand, onSettled]);

  const value = useMemo<MockSessionContextValue>(() => ({
    session,
    dispatch,
    reset: () => baseDispatch({ type: "HYDRATE", session: initialSession }),
  }), [dispatch, initialSession, session]);

  return <MockSessionContext.Provider value={value}>{children}</MockSessionContext.Provider>;
}

export function useMockSession() {
  const context = useContext(MockSessionContext);
  if (!context) throw new Error("useMockSession must be used inside MockSessionProvider");
  return context;
}
