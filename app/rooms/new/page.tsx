import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateRoomWizard } from "@/features/create-room/components/create-room-wizard";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

export const metadata: Metadata = {
  title: "Create a room",
  description: "Create a private temporary EventSpace room.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CreateRoomRoute() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/login?next=/rooms/new");
  }

  return <CreateRoomWizard />;
}
