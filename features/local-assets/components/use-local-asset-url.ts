"use client";

import { useEffect, useState } from "react";
import type { AssetReference } from "@/core/domain/asset";
import { getLocalAssetBlob } from "../model/local-asset-repository";

const urls = new Map<string, { url: string; users: number }>();
const pending = new Map<string, Promise<string | null>>();

async function createUrl(reference: AssetReference) {
  const existing = urls.get(reference.id);
  if (existing) { existing.users += 1; return existing.url; }
  let request = pending.get(reference.id);
  if (!request) {
    request = getLocalAssetBlob(reference).then((blob) => blob ? URL.createObjectURL(blob) : null);
    pending.set(reference.id, request);
  }
  const url = await request;
  pending.delete(reference.id);
  if (!url) return null;
  const raced = urls.get(reference.id);
  if (raced) { raced.users += 1; return raced.url; }
  urls.set(reference.id, { url, users: 1 });
  return url;
}

function releaseUrl(id: string) {
  const entry = urls.get(id);
  if (!entry) return;
  entry.users -= 1;
  if (entry.users > 0) return;
  URL.revokeObjectURL(entry.url);
  urls.delete(id);
}

export function useLocalAssetUrl(reference?: AssetReference | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!reference) { queueMicrotask(() => { if (active) setUrl(null); }); return () => { active = false; }; }
    void createUrl(reference).then((next) => { if (active) setUrl(next); else if (next) releaseUrl(reference.id); });
    return () => { active = false; releaseUrl(reference.id); };
  }, [reference]);
  return url;
}
