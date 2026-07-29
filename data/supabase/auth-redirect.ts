const DEFAULT_AUTH_DESTINATION = "/rooms";
const AUTH_DESTINATION_PREFIXES = ["/rooms/", "/join/"] as const;
const AUTH_DESTINATIONS = new Set([
  "/",
  "/account",
  "/join",
  "/rooms",
  "/rooms/new",
]);

export type AuthDestinationResult =
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false };

export function parseAuthDestination(
  value: string | null | undefined,
): AuthDestinationResult {
  if (value === null || value === undefined || value === "") {
    return { ok: true, path: DEFAULT_AUTH_DESTINATION };
  }

  if (
    value !== value.trim() ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return { ok: false };
  }

  try {
    const parsed = new URL(value, "https://eventspace.invalid");
    const allowed =
      AUTH_DESTINATIONS.has(parsed.pathname) ||
      AUTH_DESTINATION_PREFIXES.some((prefix) =>
        parsed.pathname.startsWith(prefix),
      );

    if (!allowed || parsed.origin !== "https://eventspace.invalid") {
      return { ok: false };
    }

    return {
      ok: true,
      path: `${parsed.pathname}${parsed.search}${parsed.hash}`,
    };
  } catch {
    return { ok: false };
  }
}

export function parseTrustedRequestOrigin(
  originHeader: string | null,
  hostHeader: string | null,
  forwardedProtoHeader: string | null = null,
  refererHeader: string | null = null,
): string | null {
  if (
    !hostHeader ||
    hostHeader.includes(",") ||
    hostHeader !== hostHeader.trim() ||
    /[\s/@\\]/u.test(hostHeader)
  ) {
    return null;
  }

  try {
    const candidate = originHeader
      ? new URL(originHeader)
      : refererHeader
        ? new URL(refererHeader)
        : null;
    const hostName = new URL(`http://${hostHeader}`).hostname;
    const localDevelopmentHost =
      hostName === "localhost" || hostName === "127.0.0.1";
    const protocol = candidate?.protocol ??
      (forwardedProtoHeader === "http:" || forwardedProtoHeader === "https:"
        ? forwardedProtoHeader
        : forwardedProtoHeader === "http" || forwardedProtoHeader === "https"
          ? `${forwardedProtoHeader}:`
          : localDevelopmentHost
            ? "http:"
            : "https:");
    const origin = candidate ?? new URL(`${protocol}//${hostHeader}`);
    const localDevelopmentOrigin =
      origin.protocol === "http:" &&
      (origin.hostname === "localhost" || origin.hostname === "127.0.0.1");
    const secureOrigin = origin.protocol === "https:";

    if (
      (!secureOrigin && !localDevelopmentOrigin) ||
      (originHeader !== null && origin.origin !== originHeader) ||
      origin.host.toLowerCase() !== hostHeader.toLowerCase()
    ) {
      return null;
    }

    return origin.origin;
  } catch {
    return null;
  }
}

export function isLocalAuthOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

export function createAuthCallbackUrl(origin: string, destination: string) {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", destination);

  return callbackUrl.toString();
}
