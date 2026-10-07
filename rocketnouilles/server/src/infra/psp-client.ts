import type { CardInput } from "../../../shared/types";
import { HttpError, requestJson } from "./http";

export interface ChargeRequest {
  amountCents: number;
  currency: "EUR";
  description: string;
  idempotencyKey: string;
  card: CardInput;
}

export interface ChargeResult {
  id: string;
  type: "charge" | "payout";
  status: "succeeded" | "declined";
  amountCents: number;
  cardLast4: string;
  failureCode: string | null;
  failureMessage: string | null;
}

export type ChargeOutcome =
  | { ok: true; charge: ChargeResult }
  | { ok: false; code: string; message: string };

/** Client for NoodlePay. Waits longer than the PSP's own 15 s network timeout. */
export class PspClient {
  constructor(private readonly baseUrl: string) {}

  async charge(request: ChargeRequest): Promise<ChargeOutcome> {
    try {
      const charge = await requestJson<ChargeResult>(`${this.baseUrl}/charges`, {
        method: "POST",
        body: request,
        timeoutMs: 20_000,
      });
      return { ok: true, charge };
    } catch (error) {
      if (error instanceof HttpError && error.status === 402) {
        const declined = error.body as ChargeResult;
        return { ok: false, code: declined.failureCode ?? "declined", message: declined.failureMessage ?? "Declined" };
      }
      if (error instanceof HttpError && error.status === 504) {
        return { ok: false, code: "timeout", message: "The payment provider timed out. You were not charged." };
      }
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, code: "psp_unavailable", message: `Payment provider unavailable (${message})` };
    }
  }
}
