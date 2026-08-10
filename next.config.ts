import type { NextConfig } from "next";
import { hostname, networkInterfaces } from "node:os";

import { parsePublicSupabaseEnv } from "./data/supabase/env-schema";

const publicSupabaseEnv = parsePublicSupabaseEnv({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
const supabaseUrl = new URL(publicSupabaseEnv.url);
const localDevOrigins = Array.from(new Set([
  hostname(),
  ...Object.values(networkInterfaces()).flatMap((addresses) =>
    (addresses ?? [])
      .filter((address) => address.family === "IPv4" && !address.internal)
      .map((address) => address.address),
  ),
]));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: localDevOrigins,
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
