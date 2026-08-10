import type { ZineDraft, ZinePhoto, ZineStyleId } from "./zine-draft";

export type ZineReaderPage =
  | {
      readonly id: "cover";
      readonly kind: "cover";
      readonly density: "hard";
      readonly title: string;
    }
  | {
      readonly id: "back";
      readonly kind: "back";
      readonly density: "hard";
      readonly title: string;
    }
  | {
      readonly id: string;
      readonly kind: "content";
      readonly density: "soft";
      readonly title: string;
      readonly styleId: ZineStyleId;
      readonly photos: readonly ZinePhoto[];
      readonly pageNumber: number;
      readonly side: "left" | "right";
    }
  | {
      readonly id: "colophon";
      readonly kind: "colophon";
      readonly density: "soft";
      readonly title: string;
      readonly pageNumber: number;
      readonly side: "left" | "right";
    };

const photosPerPage: Readonly<Record<ZineStyleId, number>> = {
  editorial: 1,
  contact: 4,
  margin: 1,
  split: 2,
  night: 1,
};

/**
 * Builds the physical book independently from Step 2's card lanes. Reader
 * pacing starts at the end of the upload collection, then alternates inward.
 */
export function createZineReaderPages(draft: ZineDraft): readonly ZineReaderPage[] {
  if (!draft.styleId) return [];

  const orderedPhotos = pacePhotosForReader(draft.photos);
  const contentPages = chunk(orderedPhotos, photosPerPage[draft.styleId]).map(
    (photos, index): ZineReaderPage => ({
      id: `content-${index + 1}`,
      kind: "content",
      density: "soft",
      title: draft.name,
      styleId: draft.styleId as ZineStyleId,
      photos,
      pageNumber: index + 1,
      side: (index + 1) % 2 === 1 ? "left" : "right",
    }),
  );

  const pages: ZineReaderPage[] = [
    { id: "cover", kind: "cover", density: "hard", title: draft.name },
    ...contentPages,
  ];

  if (contentPages.length % 2 === 1) {
    pages.push({
      id: "colophon",
      kind: "colophon",
      density: "soft",
      title: draft.name,
      pageNumber: contentPages.length + 1,
      side: "right",
    });
  }

  pages.push({ id: "back", kind: "back", density: "hard", title: draft.name });
  return pages;
}

export function pacePhotosForReader(photos: readonly ZinePhoto[]): readonly ZinePhoto[] {
  const paced: ZinePhoto[] = [];
  let left = 0;
  let right = photos.length - 1;

  while (left <= right) {
    paced.push(photos[right]);
    right -= 1;
    if (left <= right) {
      paced.push(photos[left]);
      left += 1;
    }
  }

  return paced;
}

function chunk<T>(items: readonly T[], size: number): readonly (readonly T[])[] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}
