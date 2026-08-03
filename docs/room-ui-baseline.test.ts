import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const baseline = {
  "features/room/components/room-experience.tsx": "0500DF689A29E22D7A674559371E0A2B0689689FE9AEAC1667801F2C0E1AC92F",
  "features/room/components/room-experience.module.css": "3DF040E21AE32BD2549F9C1C97748DC8BECD33D552C860F1C0E794B52D0BC11D",
  "features/room/components/chat-panel.tsx": "584EF27E99B81B2FF9C11628B842BE5D5021DD5D6CD8B406BA91C49F91F296C3",
  "features/room/components/chat-panel.module.css": "027D76E3680DBBD02F3228EC2E3B7BC7CF938F0325F854E61AB9522CC236DBB5",
  "features/room/components/itinerary/itinerary-panel.tsx": "6D4C6419523536D6AC7920C21F25252B67F8EF301502A15D2EFE5BF8310BB671",
  "features/room/components/itinerary/itinerary.module.css": "E2469044274A701F5B930425054408DB4AEB312C298644B0504EB65A0DC1A6F9",
  "features/room/components/room-controls.tsx": "D1678706FBCC2E3937C1B6ECEAA1EF6214CDF9438A2EDEA67AD5BFFBDF335613",
  "features/room/components/room-controls.module.css": "0F3467F9E039CC5A85BC8A542197C3E63A251C4C65FA19081973C8C49CAB44E0",
  "features/room/components/photos-panel.tsx": "2276E645377250C8999D3963173B62829E3BA35F666A9F5BDD240F53464DDDD3",
  "features/room/components/photos-panel.module.css": "4D76FFCB722E284C93D663EA4BF39197C88D11EF8A4FC9490E11891A580DCC02",
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
