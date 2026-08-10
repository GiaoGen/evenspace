import type { ZineStyleId } from "./zine-draft";

export type ZineStyleDefinition = {
  readonly id: ZineStyleId;
  readonly name: string;
  readonly description: string;
  readonly pageNote: string;
};

export const zineStyleOptions: readonly ZineStyleDefinition[] = [
  {
    id: "editorial",
    name: "Editorial",
    description: "One clear image with a strong title and quiet edge note.",
    pageNote: "Bold / open",
  },
  {
    id: "contact",
    name: "Contact sheet",
    description: "A compact collection of moments with indexed captions.",
    pageNote: "Dense / rhythmic",
  },
  {
    id: "margin",
    name: "Wide margin",
    description: "Small photographs surrounded by deliberate open space.",
    pageNote: "Quiet / spacious",
  },
  {
    id: "split",
    name: "Split frame",
    description: "Two photographs hold a page together in equal tension.",
    pageNote: "Balanced / direct",
  },
  {
    id: "night",
    name: "Night index",
    description: "Dark pages, pale type and photographs held in clean fields.",
    pageNote: "Dark / cinematic",
  },
];

export function getZineStyle(styleId: ZineStyleId | null) {
  return zineStyleOptions.find((style) => style.id === styleId) ?? null;
}
