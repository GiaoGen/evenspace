import type { ReactNode } from "react";

import styles from "@/features/account/components/account-page.module.css";

export default function AccountLayout({ children }: { readonly children: ReactNode }) {
  return <div className={styles.accountRouteEntry}>{children}</div>;
}
