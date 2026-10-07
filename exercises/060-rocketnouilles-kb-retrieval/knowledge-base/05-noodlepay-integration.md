---
title: NoodlePay integration and test cards
owner: Payments squad
updated: 2026-09-24
status: current
audience: engineers, trainers, participants
source: psp/README.md in the rocketnouilles repository
---

# NoodlePay integration and test cards

NoodlePay is our **mock** payment service provider. No money moves, ever: the real bill is settled at
Happy Nouilles. Every node embeds a copy under `/psp`; a standalone copy runs with `npm run psp` on port `4900`
and is used when a node is started with `--psp <url>`.

## Charge API

`POST /charges` with `{ amountCents, currency: "EUR", description, idempotencyKey, card: { number, expiry, cvc } }`.

| Status | Meaning |
|---|---|
| `201` | `status: "succeeded"`, with `id`, `type`, `amountCents`, `cardLast4` |
| `402` | `status: "declined"` with `failureCode` and `failureMessage` |
| `504` | `{ error: "timeout" }`: **no charge is created** |
| `400` | malformed request |

`GET /charges/:id` returns a stored charge; `GET /health` is a liveness probe.

**Idempotency.** Sending the same `idempotencyKey` again returns the original charge (same id, same status),
whatever the new body says. The checkout dialog generates a new key for every click on *Pay*.

**Amounts.** NoodlePay trusts its merchant and accepts any finite amount. A **negative** amount is treated as a
refund to the card holder: the charge comes back with `type: "payout"` and `status: "succeeded"`. The node is
responsible for never asking for a negative amount (see the promotions policy, rule P-6).

## Test cards

Any future expiry such as `12/30` and any 3-digit CVC.

| Card number | Result | Message shown |
|---|---|---|
| `4242 4242 4242 4242` | succeeds | — |
| `4000 0000 0000 0002` | declined, `card_declined` | "Your card was declined." |
| `4000 0000 0000 9995` | declined, `insufficient_funds` | "Your card has insufficient funds." |
| `4000 0000 0000 0119` | hangs about 15 seconds, then `504` | "The payment provider timed out. You were not charged." |
| any other Luhn-valid number | succeeds | — |
| not Luhn-valid | declined, `incorrect_number` | "Your card number is incorrect." |
| past expiry | declined, `expired_card` | "Your card has expired." |

A card is valid until the end of its expiry month.

## How the node uses NoodlePay

- The node prices the order, then calls `POST /charges` with the order total and a description
  `RocketNouilles <TABLE>:<Name>`. It waits up to 20 seconds, longer than NoodlePay's own timeout.
- On success the order becomes **PAID** and the charge id, type, amount and last four digits are stored in the
  order and shown on the group sheet ("Total paid (card •••• 4242)").
- On a decline or a timeout the order stays in **DRAFT** and the error is shown in the checkout dialog.
- If the NoodlePay URL cannot be reached at all, the error code is `psp_unavailable`
  ("Payment provider unavailable (…)").
