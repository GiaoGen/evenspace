export interface CenteredScrollInput {
  readonly scrollTop: number;
  readonly containerTop: number;
  readonly containerHeight: number;
  readonly targetTop: number;
  readonly targetHeight: number;
}

/** Returns a vertical offset for one scroll container without touching ancestors. */
export function getCenteredScrollTop(input: CenteredScrollInput): number {
  return Math.max(
    0,
    input.scrollTop
      + input.targetTop
      - input.containerTop
      - (input.containerHeight - input.targetHeight) / 2,
  );
}
