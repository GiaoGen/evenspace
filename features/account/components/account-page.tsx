"use client";

import { useMemo, useState } from "react";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { getAccountSummary, isDisplayNameAvailable } from "../model/account-summary";
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

export function AccountPage() {
  const { session, dispatch, reset } = useMockSession();
  const [sheet, setSheet] = useState<AccountSheet | null>(null);
  const summary = useMemo(() => getAccountSummary(session), [session]);

  function saveName(displayName: string) {
    dispatch({ type: "COMMAND", command: { type: "UPDATE_PROFILE", actorId: session.viewer.actorId, displayName, initials: getInitials(displayName), nowIso: new Date().toISOString() } });
  }

  function switchMode() {
    const signedIn = session.viewer.authState === "signed-in";
    dispatch({ type: "COMMAND", command: { type: "SET_AUTH_STATE", actorId: session.viewer.actorId, authState: signedIn ? "guest" : "signed-in", email: signedIn ? null : "local@eventspace.invalid" } });
    setSheet(null);
  }

  function resetLocalData() {
    reset();
    setSheet(null);
  }

  return (
    <div className={styles.page}>
      <AccountHeader />
      <main>
        <IdentityCard viewer={session.viewer} summary={summary} nameAvailable={(name) => isDisplayNameAvailable(session, name)} saveName={saveName} />
        <AccountModeCard authState={session.viewer.authState} onOpen={() => setSheet("mode")} />
        <AppearancePicker value={session.viewer.theme} onChange={(theme) => dispatch({ type: "COMMAND", command: { type: "SET_THEME", theme } })} />
        <LocalDataCard summary={summary} onManage={() => setSheet("data")} />
        <AccountLinks />
      </main>
      {sheet ? <AccountActionSheet sheet={sheet} authState={session.viewer.authState} roomCount={summary.storedRooms} close={() => setSheet(null)} switchMode={switchMode} reset={resetLocalData} /> : null}
    </div>
  );
}
