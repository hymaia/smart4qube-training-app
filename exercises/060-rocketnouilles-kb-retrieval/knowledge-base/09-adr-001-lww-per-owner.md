---
title: "ADR-001: Versioned last-writer-wins per order owner"
owner: Ordering squad
updated: 2026-06-12
status: accepted
deciders: Ordering squad, Training-day coordinator
---

# ADR-001: Versioned last-writer-wins per order owner

## Context

Orders are replicated between laptops on a shared Wi-Fi network. Laptops sleep, crash and rejoin; messages are
duplicated, delayed or arrive out of order. We need every laptop of a table to converge on the same orders,
so that the printed group sheets are identical, without a central server and without a consensus protocol that
a group of five laptops would have to run on a training-room network.

## Decision

- Each order has exactly **one writer**: the node of the participant who owns it. No other node ever modifies
  that order.
- The owner increments an integer `version` on every change.
- A receiving node keeps an incoming copy only if its `version` is **strictly greater** than the copy it holds.
  Equal and lower versions are ignored (`server/src/protocol/merge.ts`).
- Orders are **pushed** by the owner after each change and **pulled** from every peer every few seconds; a pull
  returns every order the peer knows, so orders also travel through third parties.
- The table closure is the only shared decision. Concurrent closes are resolved deterministically: the earliest
  `closedAt` wins, ties go to the smallest participant name.

## Consequences

- Duplicates and reordering are harmless; replaying a message is always safe.
- There are no write conflicts to resolve, because two nodes never write the same order.
- Nobody can act on behalf of an absent participant: an offline participant with dishes blocks the close until
  their node comes back (accepted: the group is in the same room).
- Pricing must happen on the owner's node and be frozen in the order at payment; other nodes only display it.
- The sheet is a pure function of replicated orders, closure and menu, which makes byte-identical sheets
  possible.

## Alternatives considered

- **A central order server.** Simplest model, but a single laptop or a hosted service becomes a dependency on the
  day; rejected.
- **Wall-clock last-writer-wins.** Laptop clocks drift; a skewed clock could silently overwrite a newer order.
  Rejected in favour of owner-incremented versions.
- **CRDT per cart line.** More than we need when each order has a single writer.
