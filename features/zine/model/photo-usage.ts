import type { ZineManualSpread } from "./zine-manual-layout";

/**
 * Counts visible photo usage from Recipe Assignments, not page ownership.
 * A spread Assignment is rendered twice but remains one placement instance.
 */
export function getPhotoUseCounts(
  spreads: readonly ZineManualSpread[] | null,
) {
  const counts = new Map<string, number>();
  const countedPlacementIds = new Set<string>();
  for (const spread of spreads ?? []) {
    for (const page of [spread.left, spread.right]) {
      for (const assignment of page?.recipeApplication?.assignments ?? []) {
        if (countedPlacementIds.has(assignment.placementId)) continue;
        countedPlacementIds.add(assignment.placementId);
        counts.set(assignment.photoId, (counts.get(assignment.photoId) ?? 0) + 1);
      }
    }
  }
  return counts;
}
