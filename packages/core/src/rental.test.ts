import { describe, expect, it } from "vitest";
import { canTransition, isTerminal, rentalDays, rentalFee } from "./rental";
import { applySignal, BASE_TEMPERATURE } from "./trust";

describe("rental state machine", () => {
  it("owner accepts a request, renter cannot", () => {
    expect(canTransition("requested", "accepted", "owner")).toBe(true);
    expect(canTransition("requested", "accepted", "renter")).toBe(false);
  });
  it("only owner approves return (승인 기반 거래 종결)", () => {
    expect(canTransition("returned", "completed", "owner")).toBe(true);
    expect(canTransition("returned", "completed", "renter")).toBe(false);
  });
  it("cannot cancel after handover", () => {
    expect(canTransition("handed_over", "cancelled", "renter")).toBe(false);
  });
  it("terminal states", () => {
    expect(isTerminal("completed")).toBe(true);
    expect(isTerminal("returned")).toBe(false);
  });
});

describe("fee", () => {
  it("counts both start and end day", () => {
    expect(rentalDays("2026-11-10", "2026-11-12")).toBe(3);
    expect(rentalFee(3000, "2026-11-10", "2026-11-12")).toBe(9000);
  });
  it("rejects reversed period", () => {
    expect(() => rentalDays("2026-11-12", "2026-11-10")).toThrow();
  });
});

describe("trust temperature", () => {
  it("drops on fault, clamps to range", () => {
    expect(applySignal(BASE_TEMPERATURE, { kind: "disputed_at_fault" })).toBe(34.5);
    expect(applySignal(0.5, { kind: "disputed_at_fault" })).toBe(0);
  });
});

import { addDays, availableTransitions, isMyTurn, rangesOverlap, todayKST } from "./rental";

describe("rental helpers", () => {
  it("lists actions per actor", () => {
    expect(availableTransitions("requested", "owner")).toEqual(["accepted", "rejected", "cancelled"]);
    expect(availableTransitions("requested", "renter")).toEqual(["cancelled"]);
    expect(availableTransitions("handed_over", "renter")).toEqual(["returned"]);
  });
  it("my turn excludes cancel-only", () => {
    expect(isMyTurn("requested", "renter")).toBe(false);
    expect(isMyTurn("requested", "owner")).toBe(true);
    expect(isMyTurn("returned", "owner")).toBe(true);
    expect(isMyTurn("returned", "renter")).toBe(false);
  });
  it("overlap is inclusive", () => {
    expect(rangesOverlap("2026-11-10", "2026-11-12", "2026-11-12", "2026-11-14")).toBe(true);
    expect(rangesOverlap("2026-11-10", "2026-11-12", "2026-11-13", "2026-11-14")).toBe(false);
  });
  it("todayKST uses Korea time", () => {
    // 2026-11-09 16:00 UTC = 2026-11-10 01:00 KST
    expect(todayKST(new Date("2026-11-09T16:00:00Z"))).toBe("2026-11-10");
  });
  it("addDays crosses months", () => {
    expect(addDays("2026-11-29", 3)).toBe("2026-12-02");
  });
});

import { canReturn, missingShots, requiresProof, shotOf } from "./rental";

describe("condition proofs", () => {
  it("reads the shot from the file name", () => {
    expect(shotOf("u1/r1/front-abc.jpg")).toBe("front");
    expect(shotOf("u1/r1/label-x.jpg")).toBe("label");
    expect(shotOf("u1/r1/9f2c-old.jpg")).toBe("extra");
  });
  it("lists missing required shots", () => {
    expect(missingShots(["a/b/front-1.jpg", "a/b/extra-2.jpg"])).toEqual(["back", "label"]);
    expect(missingShots(["a/b/front-1.jpg", "a/b/back-2.jpg", "a/b/label-3.jpg"])).toEqual([]);
  });
  it("requires proof only when the clothes change hands", () => {
    expect(requiresProof("handed_over")).toBe(true);
    expect(requiresProof("returned")).toBe(true);
    expect(requiresProof("completed")).toBe(false);
  });
  it("return needs receipt confirmation", () => {
    expect(canReturn("handed_over", false)).toBe(false);
    expect(canReturn("handed_over", true)).toBe(true);
  });
});
