import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPspApp } from "../psp/src/app";
import { isLuhnValid } from "../psp/src/cards";

let base = "";
let close = () => {};

beforeAll(async () => {
  const server = createPspApp({ timeoutDelayMs: 50, now: () => new Date("2026-10-07T12:00:00Z") }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
afterAll(() => close());

let keySeq = 0;
async function charge(number: string, overrides: Record<string, unknown> = {}) {
  const response = await fetch(`${base}/charges`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      amountCents: 1350,
      currency: "EUR",
      description: "test",
      idempotencyKey: `key-${++keySeq}`,
      card: { number, expiry: "12/30", cvc: "123" },
      ...overrides,
    }),
  });
  return { status: response.status, body: await response.json() };
}

describe("NoodlePay test cards", () => {
  it("4242 4242 4242 4242 succeeds", async () => {
    const res = await charge("4242 4242 4242 4242");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "succeeded", type: "charge", amountCents: 1350, cardLast4: "4242" });
  });

  it("4000 0000 0000 0002 is declined", async () => {
    const res = await charge("4000 0000 0000 0002");
    expect(res.status).toBe(402);
    expect(res.body).toMatchObject({ status: "declined", failureCode: "card_declined" });
  });

  it("4000 0000 0000 9995 has insufficient funds", async () => {
    const res = await charge("4000000000009995");
    expect(res.body.failureCode).toBe("insufficient_funds");
  });

  it("4000 0000 0000 0119 times out with a 504", async () => {
    const res = await charge("4000 0000 0000 0119");
    expect(res.status).toBe(504);
    expect(res.body.error).toBe("timeout");
  });

  it("declines numbers that fail the Luhn check and expired cards", async () => {
    expect((await charge("4242 4242 4242 4241")).body.failureCode).toBe("incorrect_number");
    expect((await charge("4242 4242 4242 4242", { card: { number: "4242424242424242", expiry: "01/24", cvc: "123" } })).body.failureCode).toBe("expired_card");
    expect(isLuhnValid("5555555555554444")).toBe(true);
  });

  it("rejects malformed requests", async () => {
    expect((await charge("4242 4242 4242 4242", { amountCents: "12" })).status).toBe(400);
    expect((await charge("4242 4242 4242 4242", { idempotencyKey: "" })).status).toBe(400);
  });
});

describe("NoodlePay idempotency and lookup", () => {
  it("returns the same charge for the same idempotency key", async () => {
    const first = await charge("4242 4242 4242 4242", { idempotencyKey: "same-key" });
    const second = await charge("4242 4242 4242 4242", { idempotencyKey: "same-key", amountCents: 9999 });
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.amountCents).toBe(1350);
  });

  it("replays a declined charge for the same key", async () => {
    const first = await charge("4000 0000 0000 0002", { idempotencyKey: "declined-key" });
    const second = await charge("4242 4242 4242 4242", { idempotencyKey: "declined-key" });
    expect(second.status).toBe(402);
    expect(second.body.id).toBe(first.body.id);
  });

  it("fetches a charge by id", async () => {
    const created = await charge("4242 4242 4242 4242");
    const fetched = await (await fetch(`${base}/charges/${created.body.id}`)).json();
    expect(fetched).toEqual(created.body);
    expect((await fetch(`${base}/charges/ch_nope`)).status).toBe(404);
  });

  it("treats a negative amount as a payout", async () => {
    const res = await charge("4242 4242 4242 4242", { amountCents: -500 });
    expect(res.body).toMatchObject({ status: "succeeded", type: "payout", amountCents: -500 });
  });
});
