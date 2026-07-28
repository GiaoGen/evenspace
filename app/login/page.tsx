import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { parseAuthDestination } from "@/data/supabase/auth-redirect";
import { createSupabaseServerClient } from "@/data/supabase/server-client";
import { LoginForm } from "@/features/auth/components/login-form";
import styles from "@/features/auth/components/login-page.module.css";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to host and keep your EventSpace rooms.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ next?: string }>;
}) {
  const destination = parseAuthDestination((await searchParams).next);
  const next = destination.ok ? destination.path : "/rooms";
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims?.sub) {
    redirect(next);
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <LoginForm next={next} />
      </main>
    </div>
  );
}
