import { describe, expect, it } from "vitest";
import type { Order } from "../shared/types";
import { closeBlockers, closeRefusal } from "../server/src/protocol/close";
import { mergeOrder, mergeOrders, pickClosure } from "../server/src/protocol/merge";
import { line, order } from "./helpers";

describe("order merge (versioned last-writer-wins per owner)", () => {
  it("inserts an order from a new participant", () => {
    const orders: Record<string, Order> = {};
    expect(mergeOrder(orders, order("Bob"), "RAMEN")).toBe("inserted");
    expect(orders.Bob.version).toBe(1);
  });

  it("replaces a known order only with a higher version", () => {
    const orders = { Bob: order("Bob", { version: 3 }) };
    expect(mergeOrder(orders, order("Bob", { version: 4, status: "PAID" }), "RAMEN")).toBe("updated");
    expect(orders.Bob.status).toBe("PAID");
  });

  it("ignores stale and duplicate versions", () => {
    const orders = { Bob: order("Bob", { version: 5, status: "CONFIRMED" }) };
    expect(mergeOrder(orders, order("Bob", { version: 5, status: "DRAFT" }), "RAMEN")).toBe("stale");
    expect(mergeOrder(orders, order("Bob", { version: 2, status: "DRAFT" }), "RAMEN")).toBe("stale");
    expect(orders.Bob.status).toBe("CONFIRMED");
  });

  it("refuses orders from another table", () => {
    const orders: Record<string, Order> = {};
    expect(mergeOrder(orders, order("Eve", { table: "UDON" }), "RAMEN")).toBe("wrong-table");
    expect(orders).toEqual({});
  });

  it("converges whatever the delivery order", () => {
    const versions = [order("Bob", { version: 1 }), order("Bob", { version: 3 }), order("Bob", { version: 2 })];
    const a: Record<string, Order> = {};
    const b: Record<string, Order> = {};
    mergeOrders(a, versions, "RAMEN");
    mergeOrders(b, [...versions].reverse(), "RAMEN");
    expect(a.Bob.version).toBe(3);
    expect(b.Bob.version).toBe(3);
  });

  it("keeps the earliest closure so concurrent closes converge", () => {
    const early = { closedAt: "2026-10-07T12:00:00.000Z", closedBy: "Bob" };
    const late = { closedAt: "2026-10-07T12:00:05.000Z", closedBy: "Alice" };
    expect(pickClosure(early, late)).toBe(early);
    expect(pickClosure(late, early)).toBe(early);
    expect(pickClosure(null, late)).toBe(late);
    const tie = { closedAt: early.closedAt, closedBy: "Alice" };
    expect(pickClosure(early, tie)).toBe(tie);
  });
});

describe("close preconditions", () => {
  const everyoneOnline = () => true;
  const confirmed = (name: string) => order(name, { status: "CONFIRMED", lines: [line("nems-porc", 700)] });

  it("allows closing when every order is confirmed", () => {
    expect(closeRefusal([confirmed("Alice"), confirmed("Bob")], everyoneOnline)).toBeNull();
  });

  it("refuses while someone has not confirmed", () => {
    const orders = [confirmed("Alice"), order("Bob", { status: "PAID", lines: [line("nems-porc", 700)] })];
    expect(closeBlockers(orders, everyoneOnline)).toEqual(["Bob"]);
    expect(closeRefusal(orders, everyoneOnline)).toBe("Waiting for Bob to confirm");
  });

  it("refuses when nobody confirmed anything", () => {
    expect(closeRefusal([order("Alice")], everyoneOnline)).toBe("Nobody has confirmed an order yet");
  });

  it("an online participant with an empty cart must confirm too", () => {
    expect(closeBlockers([confirmed("Alice"), order("Dave")], everyoneOnline)).toEqual(["Dave"]);
    expect(closeRefusal([confirmed("Alice"), order("Dave", { status: "CONFIRMED" })], everyoneOnline)).toBeNull();
  });

  it("an offline participant with an empty cart does not block the table", () => {
    const onlyAlice = (name: string) => name === "Alice";
    expect(closeRefusal([confirmed("Alice"), order("Ghost")], onlyAlice)).toBeNull();
  });

  it("an offline participant with an unconfirmed cart still blocks", () => {
    const onlyAlice = (name: string) => name === "Alice";
    const orders = [confirmed("Alice"), order("Bob", { lines: [line("nems-porc", 700)] })];
    expect(closeBlockers(orders, onlyAlice)).toEqual(["Bob"]);
  });
});
