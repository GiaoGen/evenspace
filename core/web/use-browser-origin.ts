"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

export function useBrowserOrigin() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => "",
  );
}
