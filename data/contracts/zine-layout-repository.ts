import type { ZineLayoutDocument } from "@/features/zine/model/layout-document";

/** Read boundary shared by fixture, database, and future immutable-version adapters. */
export interface ZineLayoutRepository {
  getLayoutById(id: string): Promise<ZineLayoutDocument | null>;
}
