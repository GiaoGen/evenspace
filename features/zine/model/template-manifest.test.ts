import { describe, expect, it } from "vitest";

import {
  getZineTemplateManifest,
  zineTemplateManifests,
  zineTemplateManifestSchema,
} from "./template-manifest";

describe("zine template manifests", () => {
  it("registers exactly the two MVP styles as valid manifests", () => {
    expect(zineTemplateManifests).toHaveLength(2);
    expect(zineTemplateManifests.every((manifest) => zineTemplateManifestSchema.safeParse(manifest).success)).toBe(true);
    expect(zineTemplateManifests.map((manifest) => manifest.style)).toEqual(["quiet-field", "living-sequence"]);
  });

  it("keeps style-specific cover and page families separate", () => {
    const quiet = getZineTemplateManifest("quiet-field");
    const sequence = getZineTemplateManifest("living-sequence");
    expect(quiet.coverFamilies.every((family) => family.id.startsWith("quiet-"))).toBe(true);
    expect(quiet.pageFamilies.every((family) => family.id.startsWith("quiet-"))).toBe(true);
    expect(sequence.coverFamilies.every((family) => family.id.startsWith("sequence-"))).toBe(true);
    expect(sequence.pageFamilies.every((family) => family.id.startsWith("sequence-"))).toBe(true);
  });

  it("caps an individual composition at five photos", () => {
    expect(zineTemplateManifests.flatMap((manifest) => manifest.pageFamilies)
      .every((family) => family.maxPhotos <= 5)).toBe(true);
  });
});
