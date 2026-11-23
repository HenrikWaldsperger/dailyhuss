import { describe, expect, it } from "vitest";
import { coinsForReward, lockedKinds, normalizeDesign } from "./village";

describe("Taler", () => {
  it("a normal badge gives 50 Taler", () => {
    expect(coinsForReward("badge:first_day")).toBe(50);
  });
  it("big badges give 150 Taler, level 10 badge 100", () => {
    expect(coinsForReward("badge:streak_30")).toBe(150);
    expect(coinsForReward("badge:level_10")).toBe(100);
  });
  it("reaching level N gives 20 + 10·N Taler", () => {
    expect(coinsForReward("level:2")).toBe(40);
    expect(coinsForReward("level:5")).toBe(70);
  });
});

describe("designs", () => {
  it("special designs are locked until unlocked, basic ones are free", () => {
    const premium = new Map([["paint:gold", 60], ["roof:dome", 50]]);
    const d = normalizeDesign("cottage", { wall: "gold", roofStyle: "dome" });
    expect(lockedKinds(d, premium, new Set())).toEqual(["paint:gold", "roof:dome"]);
    expect(lockedKinds(d, premium, new Set(["paint:gold", "roof:dome"]))).toEqual([]);
    expect(lockedKinds(normalizeDesign("cottage", {}), premium, new Set())).toEqual([]);
  });
});
