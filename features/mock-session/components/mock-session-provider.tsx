"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type ReactNode } from "react";
import { mockSessionReducer, parsePersistedMockSession, type MockCommand, type MockSession, type MockSessionAction } from "../model/mock-session";
import { collectAssetIds } from "@/features/local-assets/model/asset-references";
import { clearLocalAssets, pruneLocalAssets } from "@/features/local-assets/model/local-asset-repository";
import { migratePersistedLocalAssets } from "@/features/local-assets/model/migrate-local-assets";
import { getLocalAssetBlob } from "@/features/local-assets/model/local-asset-repository";
import { uploadRoomMedia } from "@/features/room/model/cloud-media";
import { addPhotoCommentAction, createRoomPhotoAction, deleteRoomPhotoAction } from "@/app/rooms/[roomId]/media-actions";

const STORAGE_KEY = "eventspace:local-session:v1";
const LEGACY_STORAGE_KEY = "eventspace:mock-session:v3";

interface MockSessionContextValue {
  readonly session: MockSession;
  readonly dispatch: Dispatch<MockSessionAction>;
  readonly executeCommand: (command: MockCommand) => Promise<CommandResult>;
  readonly reset: () => void;
}

const MockSessionContext = createContext<MockSessionContextValue | null>(null);
type CommandResult = { readonly status: "ok" } | { readonly status: "error"; readonly message: string };

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

  const executeCommand = useCallback((command: MockCommand): Promise<CommandResult> => {
    dispatch({ type: "COMMAND", command });
    return Promise.resolve({ status: "ok" });
  }, [dispatch]);

  const value = useMemo<MockSessionContextValue>(() => ({ session, dispatch, executeCommand, reset: () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch { /* In-memory reset still succeeds. */ }
    void clearLocalAssets().catch(() => undefined);
    dispatch({ type: "RESET", session: initialSession });
  } }), [executeCommand, initialSession, session]);

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
  cacheScope,
  children,
  onCommand,
  onSettled,
}: {
  readonly initialSession: MockSession;
  readonly cacheScope?: string;
  readonly children: ReactNode;
  readonly onCommand: (command: MockCommand) => Promise<{ readonly status: string }>;
  readonly onSettled: (command: MockCommand) => void;
}) {
  const [session, baseDispatch] = useReducer(mockSessionReducer, initialSession);

  const executeCloudMediaCommand = useCallback(async (command: MockCommand): Promise<CommandResult> => {
    if (command.type === "POST_MESSAGE" && command.message.content?.type === "voice") {
      const blob = await getLocalAssetBlob(command.message.content.asset);
      if (!blob) return { status: "error", message: "This voice message is no longer available locally." };
      const asset = await uploadRoomMedia({
        roomPublicId: command.roomPublicId,
        kind: "voice",
        file: blob,
        mimeType: blob.type.split(";", 1)[0] || "audio/webm",
        durationMs: command.message.content.durationSeconds * 1000,
      });
      const result = await onCommand({
        ...command,
        message: {
          ...command.message,
          content: {
            ...command.message.content,
            asset: { id: asset.id, kind: "audio", mimeType: asset.mimeType, byteSize: asset.byteSize, remoteUrl: asset.signedUrl },
          },
        },
      });
      return result.status === "ok" ? { status: "ok" } : { status: "error", message: "This voice message could not be sent." };
    }
    if (command.type === "ADD_BOARD_ITEM" && command.item.kind === "photo" && command.item.asset) {
      const [blob, thumbnailBlob] = await Promise.all([
        getLocalAssetBlob(command.item.asset),
        command.item.asset.thumbnail ? getLocalAssetBlob({
          id: command.item.asset.thumbnail.id,
          kind: "image",
          mimeType: command.item.asset.thumbnail.mimeType,
          byteSize: command.item.asset.thumbnail.byteSize,
        }) : Promise.resolve(null),
      ]);
      if (!blob || !thumbnailBlob || !command.item.asset.placeholderDataUrl) {
        return { status: "error", message: "This photo is no longer available locally." };
      }
      const asset = await uploadRoomMedia({
        roomPublicId: command.roomPublicId,
        kind: "image",
        file: blob,
        mimeType: "image/jpeg",
        thumbnailFile: thumbnailBlob,
        placeholderDataUrl: command.item.asset.placeholderDataUrl,
        width: command.item.asset.width,
        height: command.item.asset.height,
        cacheScope: cacheScope ?? command.actorId,
      });
      const created = await createRoomPhotoAction({
        roomPublicId: command.roomPublicId,
        assetId: asset.id,
        originalName: command.item.imageName ?? "Photo",
        aspectRatio: command.item.aspectRatio ?? 1,
      });
      return created.ok ? { status: "ok" } : { status: "error", message: created.message };
    }
    if (command.type === "ADD_BOARD_COMMENT") {
      const created = await addPhotoCommentAction({ photoId: command.itemId, body: command.comment.body });
      return created.ok ? { status: "ok" } : { status: "error", message: created.message };
    }
    if (command.type === "DELETE_BOARD_ITEM") {
      const removed = await deleteRoomPhotoAction({ photoId: command.itemId });
      return removed.ok ? { status: "ok" } : { status: "error", message: removed.message };
    }
    const result = await onCommand(command);
    return result.status === "ok" || result.status === "ignored" ? { status: "ok" } : { status: "error", message: "This room action could not be completed." };
  }, [cacheScope, onCommand]);

  useEffect(() => {
    baseDispatch({ type: "HYDRATE", session: initialSession });
  }, [initialSession]);

  const executeCommand = useCallback(async (command: MockCommand): Promise<CommandResult> => {
    baseDispatch({ type: "COMMAND", command });
    try {
      const result = await executeCloudMediaCommand(command);
      if (result.status === "error") baseDispatch({ type: "HYDRATE", session: initialSession });
      return result;
    } catch (error) {
      console.error("Room command failed", error);
      baseDispatch({ type: "HYDRATE", session: initialSession });
      return {
        status: "error",
        message: error instanceof Error ? error.message : "This room action could not be completed.",
      };
    } finally {
      onSettled(command);
    }
  }, [executeCloudMediaCommand, initialSession, onSettled]);

  const dispatch = useCallback<Dispatch<MockSessionAction>>((action) => {
    if (action.type === "COMMAND") void executeCommand(action.command);
    else baseDispatch(action);
  }, [executeCommand]);

  const value = useMemo<MockSessionContextValue>(() => ({
    session,
    dispatch,
    executeCommand,
    reset: () => baseDispatch({ type: "HYDRATE", session: initialSession }),
  }), [dispatch, executeCommand, initialSession, session]);

  return <MockSessionContext.Provider value={value}>{children}</MockSessionContext.Provider>;
}

export function useMockSession() {
  const context = useContext(MockSessionContext);
  if (!context) throw new Error("useMockSession must be used inside MockSessionProvider");
  return context;
}
