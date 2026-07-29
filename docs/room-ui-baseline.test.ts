import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const baseline = {
  "features/room/components/room-experience.tsx": "1009CD3C9870FD4FA491C2F9449D484D57965C0B031F4C71F96D890DDEF99AFF",
  "features/room/components/room-experience.module.css": "58C24014A986240E9688599D2E8880BA4FB6618936C0DDA84AD113B6C2D9425F",
  "features/room/components/chat-panel.tsx": "0420484942460FE605778760F1C8874AF6397B8A867CA0A0F263AF6BD9D7F1B2",
  "features/room/components/chat-panel.module.css": "6C644494BEC765185703B2D1AEC23549C38F320325399AC2F03DA4F86F6031E3",
  "features/room/components/itinerary/itinerary-panel.tsx": "83769901274796CBB842818393F687FBC96F9D21AA18F7CDE8C3D14D71ABCF8E",
  "features/room/components/itinerary/itinerary.module.css": "E2469044274A701F5B930425054408DB4AEB312C298644B0504EB65A0DC1A6F9",
  "features/room/components/room-controls.tsx": "D1678706FBCC2E3937C1B6ECEAA1EF6214CDF9438A2EDEA67AD5BFFBDF335613",
  "features/room/components/room-controls.module.css": "0F3467F9E039CC5A85BC8A542197C3E63A251C4C65FA19081973C8C49CAB44E0",
  "features/room/components/photos-panel.tsx": "255A071E99C71D088FDA1EB525121A3E4A14C30F0C2879353221D6DFADF6AE59",
  "features/room/components/photos-panel.module.css": "4DF726F1F13F57BBFF68C057C8145FF9E223F426A3521021563DF02CE06D3485",
} as const;

describe("Room UI wiring baseline", () => {
  it("keeps every protected visual component byte-for-byte unchanged", () => {
    for (const [file, expected] of Object.entries(baseline)) {
      const digest = createHash("sha256")
        .update(readFileSync(resolve(process.cwd(), file)))
        .digest("hex")
        .toUpperCase();
      expect(digest, file).toBe(expected);
    }
  });
});
