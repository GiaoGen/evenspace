import type { NextConfig } from "next";

import { parsePublicSupabaseEnv } from "./data/supabase/env-schema";

const publicSupabaseEnv = parsePublicSupabaseEnv({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
const supabaseUrl = new URL(publicSupabaseEnv.url);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{
      protocol: "https",
      hostname: supabaseUrl.hostname,
      port: supabaseUrl.port,
      pathname: "/storage/v1/object/sign/room-media/**",
    }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
