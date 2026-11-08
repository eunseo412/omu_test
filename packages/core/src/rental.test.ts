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
