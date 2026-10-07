---
title: Table lifecycle and close rules
owner: Ordering squad
updated: 2026-09-21
status: current
audience: engineers, trainers
---

# Table lifecycle and close rules

## Order lifecycle

```
DRAFT ──pay (NoodlePay succeeded)──▶ PAID ──participant confirms (dialog)──▶ CONFIRMED
  │
  └── empty cart: "Confirm without ordering" ──▶ CONFIRMED (nothing on the sheet)
```

- Dishes, quantities, options and promo codes can change **only in DRAFT**. Each line holds 1 to 20 portions.
- Paying computes the price on the owner's node and freezes it in the order (`pricing` and `payment`). A paid
  order is never re-priced, even if other participants change their carts afterwards.
- A declined or timed-out payment leaves the order in **DRAFT**. Nothing is frozen.
- While a payment is in progress, the cart cannot be edited ("A payment is in progress").
- A participant with dishes must pay before confirming ("Pay for your order before confirming it").
- A participant who is not eating uses **Confirm without ordering** so they do not block the table.
- Confirming always goes through a confirmation dialog in the UI.

## Close preconditions

A node accepts "Close the table" from its own UI only when:

1. at least one order **with dishes** is `CONFIRMED` ("Nobody has confirmed an order yet" otherwise), and
2. every known participant is `CONFIRMED`, **except** a participant whose cart is empty **and** whose node is
   currently offline: someone who left without ordering.

Anyone else who is not confirmed is listed as a blocker ("Waiting for Bob to confirm"). In particular, a
participant who **has dishes in the cart** (paid or not) blocks the close even when their node is offline.
No other node can confirm on their behalf: only the owner's node writes its order. The code lives in
`server/src/protocol/close.ts` (`closeBlockers`, `closeRefusal`).

The UI asks for confirmation ("Close the table for everyone? No more changes.") before sending the close.

## After the close

- The closure `{ closedAt, closedBy }` is broadcast to every peer; the table is then **read-only** on every node.
  Any attempt to edit, pay or confirm fails with "The table is closed".
- If two people close at the same moment, every node keeps the **earliest** `closedAt`; on a tie, the smallest
  participant name wins.
- A peer that was offline during the close receives the closure on its next pull.
- The group sheet (`/sheet`) becomes final. Before the close it is marked **Preview**.

## Group sheet contents

The sheet lists the confirmed orders that have dishes, sorted by participant, with items, options, promo codes
and prices; the kitchen tally (quantity per dish and options, in menu order, with the Chinese dish name); totals;
and the allergens per participant with the menu disclaimer. It depends only on the replicated orders, the
closure and the menu, so all nodes of a closed table serve **byte-identical** sheets.
