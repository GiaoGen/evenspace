import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const baseline = {
  "features/room/components/room-experience.tsx": "C0BA00C17CC58E7FC78845AB565269B4A61F6D09CBD6BE757E6900945B1D1BBF",
  "features/room/components/room-experience.module.css": "035F410C17C43634489220772FA18488D1D75D4275F2F68912F8EDCA7D07C632",
  "features/room/components/chat-panel.tsx": "D2DA02972755BB01069010CACF9805473EF507DA84D4B958C052D2BAFBE2519C",
  "features/room/components/chat-panel.module.css": "6CEB725D4151706220EC3CD94831A31AC374FE0C4C7ABE9BBD33E76C13C893B4",
  "features/room/components/itinerary/itinerary-panel.tsx": "83769901274796CBB842818393F687FBC96F9D21AA18F7CDE8C3D14D71ABCF8E",
  "features/room/components/itinerary/itinerary.module.css": "1FDD1467FEFD29BE103B147FA61225AE45A1B90A2A26F79D51DFBEF72A7DC9DE",
  "features/room/components/room-controls.tsx": "88D28FD92C1CD3535672DB7B4B54D3C9B1A9806AEDF636597FA009B4F4437A7F",
  "features/room/components/room-controls.module.css": "95D23E2FD2EF7047CD49B99E0F8C3EDF1DE48B1B517E417F2F556714890F5B2B",
  "features/room/components/photos-panel.tsx": "5E206D0B6E44E5308F1C4C34143651123A2E0825A9B9081B9AB91D9606C3E8C4",
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
