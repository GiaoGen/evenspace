"use client";

"use client";

import { useState } from "react";
import { signOutCurrentSession } from "@/app/auth/actions";
import { updateAccountProfileAction } from "@/app/account/actions";
import type { BackendAccount } from "@/data/supabase/backend-account";
import { AccountActionSheet, type AccountSheet } from "./account-action-sheet";
import { AccountHeader } from "./account-header";
import { AccountLinks } from "./account-links";
import { AccountModeCard } from "./account-mode-card";
import { AppearancePicker } from "./appearance-picker";
import { IdentityCard } from "./identity-card";
import { LocalDataCard } from "./local-data-card";
import styles from "./account-page.module.css";

function getInitials(displayName: string) {
  return displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase() ?? "").join("");
}

export function AccountPage({ account }: { readonly account: BackendAccount }) {
  const [viewer, setViewer] = useState(account.viewer);
  const [sheet, setSheet] = useState<AccountSheet | null>(null);
  const summary = account.summary;

  async function saveName(displayName: string) {
    const result = await updateAccountProfileAction({ displayName });
    if (result.ok) setViewer((current) => ({ ...current, displayName, initials: getInitials(displayName) }));
  }

  async function saveTheme(theme: typeof viewer.theme) {
    const result = await updateAccountProfileAction({ displayName: viewer.displayName, theme });
    if (result.ok) setViewer((current) => ({ ...current, theme }));
  }

  async function signOut() {
    await signOutCurrentSession();
  }

  return (
    <div className={styles.page}>
      <AccountHeader />
      <main>
        <IdentityCard viewer={viewer} summary={summary} nameAvailable={(name) => Boolean(name.trim())} saveName={(name) => { void saveName(name); }} />
        <AccountModeCard authState={viewer.authState} onOpen={() => setSheet("mode")} />
        <AppearancePicker value={viewer.theme} onChange={(theme) => { void saveTheme(theme); }} />
        <LocalDataCard summary={summary} onManage={() => setSheet("data")} />
        <AccountLinks />
      </main>
      {sheet ? <AccountActionSheet sheet={sheet} authState={viewer.authState} roomCount={summary.storedRooms} close={() => setSheet(null)} switchMode={() => { void signOut(); }} reset={() => setSheet(null)} /> : null}
    </div>
  );
}
