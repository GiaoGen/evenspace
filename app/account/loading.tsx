"use client";

import { useSyncExternalStore } from "react";
import { AccountHeader } from "@/features/account/components/account-header";
import { AccountPage } from "@/features/account/components/account-page";
import { readAccountSnapshot, subscribeAccountSnapshot } from "@/features/account/model/account-snapshot";
import styles from "@/features/account/components/account-page.module.css";

export default function AccountLoading() {
  const snapshot = useSyncExternalStore(subscribeAccountSnapshot, readAccountSnapshot, () => null);
  if (snapshot) return <AccountPage account={snapshot.account} cacheWriteThrough={false} />;
  return (
    <div className={`${styles.page} ${styles.accountLoading}`} aria-busy="true" aria-label="Opening account">
      <AccountHeader />
      <main>
        <section className={`${styles.identityCard} ${styles.loadingIdentity}`}>
          <div className={styles.loadingIdentityTop}><i /><span><b /><b /></span><i /></div>
          <div className={styles.loadingStats}><i /><i /><i /></div>
        </section>
        <div className={styles.loadingMode}><i /><span><b /><b /></span><i /></div>
        <section className={styles.loadingAppearance}>
          <span><i /><b /></span>
          <div><i /><i /><i /></div>
        </section>
        <div className={styles.loadingData}><i /><span><b /><b /></span></div>
        <div className={styles.loadingLinks}><i /><i /><i /><i /></div>
      </main>
    </div>
  );
}
