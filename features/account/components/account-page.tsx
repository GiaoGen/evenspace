"use client";

import { useEffect, useRef, useState } from "react";
import {
  finalizeAccountAvatarUploadAction,
  prepareAccountAvatarUploadAction,
  updateAccountProfileAction,
} from "@/app/account/actions";
import { signOutCurrentSession } from "@/app/auth/actions";
import type { BackendAccount } from "@/data/supabase/backend-account";
import { createSupabaseBrowserClient } from "@/data/supabase/browser-client";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { AccountActionSheet, type AccountSheet } from "./account-action-sheet";
import { AccountHeader } from "./account-header";
import { AccountLinks } from "./account-links";
import { AccountModeCard } from "./account-mode-card";
import { AppearancePicker } from "./appearance-picker";
import { IdentityCard } from "./identity-card";
import { LocalDataCard } from "./local-data-card";
import { clearAccountSnapshot, rememberAccountCacheScope, saveAccountSnapshot } from "../model/account-snapshot";
import { clearRoomSecondarySnapshots } from "@/features/room-performance/model/room-secondary-cache";
import type { AssetReference } from "@/core/domain/asset";
import { cacheLocalAsset } from "@/features/local-assets/model/local-asset-repository";
import { clearViewerAvatar, readViewerAvatar, saveViewerAvatar } from "../model/viewer-avatar-cache";
import styles from "./account-page.module.css";

function getInitials(displayName: string) {
  return displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase() ?? "").join("");
}

export function AccountPage({ account, cacheWriteThrough = true }: { readonly account: BackendAccount; readonly cacheWriteThrough?: boolean }) {
  const [viewer, setViewer] = useState(account.viewer);
  const [sheet, setSheet] = useState<AccountSheet | null>(null);
  const themeSaveVersion = useRef(0);
  const { session, dispatch } = useMockSession();
  const summary = account.summary;

  useEffect(() => {
    if (session.viewer.theme !== viewer.theme) {
      dispatch({ type: "COMMAND", command: { type: "SET_THEME", theme: viewer.theme } });
    }
  }, [dispatch, session.viewer.theme, viewer.theme]);

  useEffect(() => {
    rememberAccountCacheScope(account.cacheScope);
    if (cacheWriteThrough) saveAccountSnapshot({ ...account, viewer });
  }, [account, cacheWriteThrough, viewer]);

  useEffect(() => {
    const cachedAvatar = readViewerAvatar(account.cacheScope);
    if (cachedAvatar) {
      queueMicrotask(() => setViewer((current) => current.avatarAsset ? current : { ...current, avatarAsset: cachedAvatar }));
    }
  }, [account.cacheScope]);

  useEffect(() => {
    if (viewer.avatarUrl) return;
    const controller = new AbortController();
    void fetch("/api/viewer/avatar", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ asset?: AssetReference | null; url?: unknown }> : null)
      .then((result) => {
        if (result?.asset) {
          saveViewerAvatar(account.cacheScope, result.asset);
          setViewer((current) => ({ ...current, avatarUrl: typeof result.url === "string" ? result.url : null, avatarAsset: result.asset }));
        } else if (result) {
          clearViewerAvatar(account.cacheScope);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [account.cacheScope, viewer.avatarUrl]);

  async function saveName(displayName: string) {
    const result = await updateAccountProfileAction({ displayName });
    if (result.ok) setViewer((current) => ({ ...current, displayName, initials: getInitials(displayName) }));
  }

  async function saveTheme(theme: typeof viewer.theme) {
    if (theme === viewer.theme) return;
    const previousTheme = viewer.theme;
    const version = ++themeSaveVersion.current;
    setViewer((current) => ({ ...current, theme }));
    dispatch({ type: "COMMAND", command: { type: "SET_THEME", theme } });

    const result = await updateAccountProfileAction({ theme });
    if (!result.ok && version === themeSaveVersion.current) {
      setViewer((current) => ({ ...current, theme: previousTheme }));
      dispatch({ type: "COMMAND", command: { type: "SET_THEME", theme: previousTheme } });
    }
  }

  async function uploadAvatar(file: File) {
    const prepared = await prepareAccountAvatarUploadAction({
      mimeType: file.type,
      byteSize: file.size,
    });
    if (!prepared.ok) return prepared;

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.storage
      .from("room-media")
      .uploadToSignedUrl(
        prepared.data.objectKey,
        prepared.data.token,
        file,
        { contentType: file.type },
      );
    if (error) return { ok: false as const, message: "The avatar upload failed." };

    const finalized = await finalizeAccountAvatarUploadAction({
      assetId: prepared.data.assetId,
    });
    if (finalized.ok) {
      const avatarAsset: AssetReference = {
        id: prepared.data.assetId,
        kind: "image",
        mimeType: file.type,
        byteSize: file.size,
        remoteUrl: finalized.data.avatarUrl,
        revision: 1,
      };
      await cacheLocalAsset(avatarAsset, file, { scope: account.cacheScope, variant: "display" });
      saveViewerAvatar(account.cacheScope, avatarAsset);
      setViewer((current) => ({
        ...current,
        avatarUrl: finalized.data.avatarUrl,
        avatarAsset,
      }));
    }
    return finalized;
  }

  async function signOut() {
    clearAccountSnapshot();
    await clearRoomSecondarySnapshots();
    await signOutCurrentSession();
  }

  return (
    <div className={styles.page}>
      <AccountHeader />
      <main>
        <IdentityCard
          viewer={viewer}
          summary={summary}
          cacheScope={account.cacheScope}
          nameAvailable={(name) => Boolean(name.trim())}
          saveName={(name) => { void saveName(name); }}
          uploadAvatar={uploadAvatar}
        />
        <AccountModeCard authState={viewer.authState} onOpen={() => setSheet("mode")} />
        <AppearancePicker value={viewer.theme} onChange={(theme) => { void saveTheme(theme); }} />
        <LocalDataCard summary={summary} onManage={() => setSheet("data")} />
        <AccountLinks />
      </main>
      {sheet ? <AccountActionSheet sheet={sheet} authState={viewer.authState} roomCount={summary.storedRooms} close={() => setSheet(null)} switchMode={() => { void signOut(); }} reset={() => setSheet(null)} /> : null}
    </div>
  );
}
