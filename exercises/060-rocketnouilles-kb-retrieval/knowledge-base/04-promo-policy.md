---
title: Promotions policy
version: 2
owner: Growth & partnerships (with Happy Nouilles)
updated: 2026-09-15
status: current
audience: everyone
applies_to: server/src/promo/
---

# Promotions policy

This policy is the agreement between the RocketNouilles team and Happy Nouilles about what each promo code is
worth and how codes combine. It describes the **intended behaviour**. The promo engine in `server/src/promo/` is
expected to implement it; if the application ever computes something different, this policy is the reference and
the difference is a defect to report.

## General rules

- **P-1 — Entering codes.** Codes are case-insensitive and surrounding spaces are ignored. Entering the same code
  twice counts once. Unknown codes are listed as rejected with a reason; they are never silently dropped.
- **P-2 — Maximum codes.** At most **4 codes** are accepted on one order. Further codes are rejected
  ("At most 4 codes per order").
- **P-3 — One fixed amount.** At most **one fixed-amount code** per order: `NOUILLES5`, `FIDELITE` and the
  `MERCI2` voucher are mutually exclusive. The first one entered wins; the others are rejected.
- **P-4 — Percentages combine one after the other.** When several percentage codes apply, each one is applied
  to the amount left after the previous ones, never to more than what is left. Example: `BIENVENUE10` and
  `SLURP20` on a 40,00 € order remove 4,00 € then 7,20 €, i.e. 11,20 € in total (28 %), not 12,00 € (30 %).
  Combined percentages therefore always stay below 100 %.
- **P-5 — Rounding.** Every discount is computed in **euro cents** and rounded to the nearest cent. The amounts
  shown in the breakdown, on the sheet and charged by NoodlePay are whole cents.
- **P-6 — Never negative.** The sum of discounts can never exceed the subtotal of the order. The total charged is
  **never negative**; the lowest possible total is 0,00 €. RocketNouilles never sends money back to a participant
  through a promotion.
- **P-7 — Own order only.** Every discount is computed on the participant's **own** cart. Other participants'
  carts may decide whether a table-level rule applies (P-9, `ANNIV`), never how much a participant saves.
- **P-8 — Frozen at payment.** The price, including discounts, is frozen when the order is paid. Changes made
  later by other participants do not change a paid order.

## Code catalogue

| Code | Kind | Intended rule |
|---|---|---|
| `BIENVENUE10` | percentage | 10 % off the order. |
| `SLURP20` | percentage | 20 % off the order. **Not combinable with `HAPPYHOUR`.** |
| `ANNIV` | percentage | 50 % off the order of the birthday person. **One per table**: once a participant has paid with it, it is rejected for everyone else at the table ("Already used by someone at your table"). |
| `HAPPYHOUR` | happy hour | 15 % off **noodle dishes only** (dishes tagged `noodles` on the menu), every day from **15:00 to 18:00, Paris time** (15:00 included, 18:00 excluded). Rejected outside that window. Not combinable with `SLURP20`. |
| `NOUILLES5` | fixed amount | 5,00 € off, only when the order is still at least **25,00 € after the other discounts**. |
| `FIDELITE` | fixed amount | 3,00 € off for regulars. |
| `MERCI2` | voucher (fixed amount) | 2,00 € off: the voucher handed out with the last takeaway bag. |
| `RAVIOLIOFFERT` | free item | **One portion** of *Raviolis grillés* (6,60 €) on the house, only when the participant has Raviolis grillés in their own cart. One portion, whatever the quantity ordered by the participant or by the rest of the table. |

## Automatic big table bonus

- **P-9 — Big table bonus (`GROUP`).** No code needed. When the whole table orders **8 noodle dishes or more**
  (all carts together), every participant who orders gets **10 % off their own order**. It is shown in the
  breakdown as "Big table bonus (N bowls at the table)".

## Examples

| Cart and codes | Expected outcome |
|---|---|
| 13,50 € noodle dish, `BIENVENUE10` | 1,35 € off, total 12,15 € |
| 27,00 €, `FIDELITE` + `MERCI2` | `FIDELITE` applies (3,00 €), `MERCI2` rejected (one fixed amount per order) |
| 26,00 €, `BIENVENUE10` + `NOUILLES5` | after 10 % the order is 23,40 €, below 25,00 €: `NOUILLES5` does not apply |
| `SLURP20` + `HAPPYHOUR` at 16:00 Paris time | the second code entered is rejected ("Cannot be combined with …") |
| `HAPPYHOUR` at 18:30 Paris time | rejected: outside happy hour |
| 2 × Raviolis grillés, `RAVIOLIOFFERT` | 6,60 € off (one portion) |

Promo codes have no cash value and cannot be exchanged.

## History

Version 2 (September 2026) replaces the launch rules: maximum 4 codes, one fixed amount per order, `SLURP20` and
`HAPPYHOUR` exclusive, happy hour moved to 15:00–18:00, `ANNIV` limited to one per table.
