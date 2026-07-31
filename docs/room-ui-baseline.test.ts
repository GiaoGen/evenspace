import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const baseline = {
  "features/room/components/room-experience.tsx": "806FEB4593AF863ECB9EA4D059E05108E5472FFC455D438F47652712C8C185F9",
  "features/room/components/room-experience.module.css": "3DF040E21AE32BD2549F9C1C97748DC8BECD33D552C860F1C0E794B52D0BC11D",
  "features/room/components/chat-panel.tsx": "EB8D724319274F082DA1F9156C56BA483EF73AD14B130928FD906134BBB6438B",
  "features/room/components/chat-panel.module.css": "877BAC04EE73FD52D62C570016C226D2C8EF7C9EA58238E21069336436124E05",
  "features/room/components/itinerary/itinerary-panel.tsx": "83769901274796CBB842818393F687FBC96F9D21AA18F7CDE8C3D14D71ABCF8E",
  "features/room/components/itinerary/itinerary.module.css": "E2469044274A701F5B930425054408DB4AEB312C298644B0504EB65A0DC1A6F9",
  "features/room/components/room-controls.tsx": "D1678706FBCC2E3937C1B6ECEAA1EF6214CDF9438A2EDEA67AD5BFFBDF335613",
  "features/room/components/room-controls.module.css": "0F3467F9E039CC5A85BC8A542197C3E63A251C4C65FA19081973C8C49CAB44E0",
  "features/room/components/photos-panel.tsx": "1054CFC6D56DCD88DF1B879F18127A73FADBA58943C0DDB00E78269CEC00FB03",
  "features/room/components/photos-panel.module.css": "CF23059AF169B7FCC787E26673A31A8D0D8A3D3C454F11FA1C606AFDABA9BD1D",
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
