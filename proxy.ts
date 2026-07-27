import type { NextRequest } from "next/server";

import { refreshSupabaseAuth } from "@/data/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  return refreshSupabaseAuth(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|woff|woff2)$).*)",
  ],
};
