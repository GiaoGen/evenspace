import { describe, expect, it } from "vitest";
import type { BoardItem } from "@/core/domain/room";
import { actorId } from "@/core/domain/ids";
import { createMemoirDocument } from "./memoir-model";

const ownerActorId = actorId("actor_test");

function photo(id: string): BoardItem {
  return { id, kind: "photo", ownerActorId, variant: "one", note: null, x: 0, y: 0, rotation: 0, width: 20 };
}

describe("createMemoirDocument", () => {
  it("keeps memory order and groups pages into open spreads", () => {
    const document = createMemoirDocument("A room", [photo("one"), photo("two"), photo("three")]);

    expect(document.spreads).toHaveLength(2);
    expect(document.pages.map((page) => page.items.map((item) => item.id))).toEqual([["one"], ["two"], ["three"], []]);
    expect(document.pages.map((page) => page.pageNumber)).toEqual([1, 2, 3, 4]);
    expect([document.spreads[0].left.pageNumber, document.spreads[0].right.pageNumber]).toEqual([1, 2]);
    expect([document.spreads[1].left.pageNumber, document.spreads[1].right.pageNumber]).toEqual([3, 4]);
  });

  it("provides a complete opening spread for an empty memoir", () => {
    const document = createMemoirDocument("Empty room", []);

    expect(document.spreads).toHaveLength(1);
    expect(document.spreads[0].left.kind).toBe("opening");
    expect(document.spreads[0].right.kind).toBe("blank");
  });

  it("keeps explicitly added empty pages", () => {
    const document = createMemoirDocument("Empty room", [], {}, 3);

    expect(document.pages.map((page) => page.pageNumber)).toEqual([1, 2, 3, 4]);
    expect(document.spreads).toHaveLength(2);
  });

  it("groups newly assigned content on an existing page", () => {
    const assigned = { ...photo("two"), memoirPage: 1 };
    const document = createMemoirDocument("A room", [photo("one"), assigned], { "1": "sage" });

    expect(document.pages[0].items.map((item) => item.id)).toEqual(["one", "two"]);
    expect(document.pages[0].paperStyle).toBe("sage");
  });
});
