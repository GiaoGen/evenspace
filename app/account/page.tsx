import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBackendAccount } from "@/data/supabase/backend-account";
import { AccountPage } from "@/features/account/components/account-page";

export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AccountRoute() {
  const account = await getBackendAccount();
  if (!account) redirect("/login?next=/account");
  return <AccountPage account={account} />;
}
