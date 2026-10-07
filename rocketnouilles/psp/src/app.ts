import express from "express";
import { randomUUID } from "node:crypto";
import { DECLINE_MESSAGES, normalizeCardNumber, outcomeFor } from "./cards";

export interface Charge {
  id: string;
  object: "charge";
  type: "charge" | "payout";
  status: "succeeded" | "declined";
  amountCents: number;
  currency: string;
  description: string;
  cardLast4: string;
  failureCode: string | null;
  failureMessage: string | null;
  idempotencyKey: string;
  createdAt: string;
}

export interface PspOptions {
  /** How long the timeout test card hangs before answering 504. */
  timeoutDelayMs?: number;
  now?: () => Date;
}

/** NoodlePay: a deliberately naive mock payment provider. */
export function createPspApp(options: PspOptions = {}) {
  const timeoutDelayMs = options.timeoutDelayMs ?? 15_000;
  const now = options.now ?? (() => new Date());
  const charges = new Map<string, Charge>();
  const byIdempotencyKey = new Map<string, Charge>();

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "noodlepay", charges: charges.size });
  });

  app.post("/charges", async (req, res) => {
    const { amountCents, currency, card, idempotencyKey, description } = req.body ?? {};
    if (typeof amountCents !== "number" || !Number.isFinite(amountCents)) {
      return void res.status(400).json({ error: "invalid_request", message: "amountCents must be a number" });
    }
    if (typeof idempotencyKey !== "string" || idempotencyKey.length === 0) {
      return void res.status(400).json({ error: "invalid_request", message: "idempotencyKey is required" });
    }
    if (!card || typeof card.number !== "string" || typeof card.expiry !== "string" || !/^\d{3,4}$/.test(String(card.cvc))) {
      return void res.status(400).json({ error: "invalid_request", message: "card { number, expiry, cvc } is required" });
    }

    const previous = byIdempotencyKey.get(idempotencyKey);
    if (previous) return void res.status(previous.status === "succeeded" ? 200 : 402).json(previous);

    const outcome = outcomeFor(card.number, card.expiry, now());
    if (outcome.kind === "timeout") {
      await new Promise((resolve) => setTimeout(resolve, timeoutDelayMs));
      return void res.status(504).json({ error: "timeout", message: "The card network did not answer in time." });
    }

    const declineCode = outcome.kind === "decline" ? outcome.code : null;
    const charge: Charge = {
      id: `ch_${randomUUID().replaceAll("-", "").slice(0, 20)}`,
      object: "charge",
      type: amountCents < 0 ? "payout" : "charge",
      status: declineCode ? "declined" : "succeeded",
      amountCents,
      currency: typeof currency === "string" ? currency : "EUR",
      description: typeof description === "string" ? description : "",
      cardLast4: normalizeCardNumber(card.number).slice(-4),
      failureCode: declineCode,
      failureMessage: declineCode ? DECLINE_MESSAGES[declineCode] : null,
      idempotencyKey,
      createdAt: now().toISOString(),
    };
    charges.set(charge.id, charge);
    byIdempotencyKey.set(idempotencyKey, charge);
    res.status(declineCode ? 402 : 201).json(charge);
  });

  app.get("/charges/:id", (req, res) => {
    const charge = charges.get(req.params.id);
    if (!charge) return void res.status(404).json({ error: "not_found", message: "No such charge" });
    res.json(charge);
  });

  return app;
}
