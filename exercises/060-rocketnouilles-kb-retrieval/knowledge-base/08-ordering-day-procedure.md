---
title: Ordering-day procedure
owner: Training-day coordinator
updated: 2026-10-02
status: current
audience: trainers, participants
---

# Ordering-day procedure

How a training group goes from "everyone has a laptop" to "the kitchen at Happy Nouilles has our order".

## 1. Before the participants arrive (trainer)

- Check the registry: `curl https://rocket-nouilles-registry.netlify.app/api/health` must answer `"ok": true`.
  If it does not, prepare the local fallback (`npm run registry:local`, see runbook RB-4).
- Make sure every laptop is on the same network and can accept incoming connections on its node port.
- Assign one table code per group: `RAMEN`, `UDON` or `SOBA`.
- Have a printer ready, and the restaurant's phone number: +33 1 44 59 31 22.

## 2. Ordering (each participant)

1. `npm install && npm run build`, then `npm run node -- --name <Name> --table <CODE>`. Names must be unique at
   the table.
2. Open `http://localhost:4001`, choose dishes and, where offered, the spice level (`mild`, `medium`, `hot`).
3. Add promo codes if you have any; the breakdown shows each discount and any rejected code with its reason.
4. Click **Checkout** and pay with a test card (`4242 4242 4242 4242`, any future expiry, any CVC). No real money
   moves.
5. **Confirm** the order in the dialog. Not eating? Use **Confirm without ordering** so you do not block the table.
6. Watch the **Table** tab until everybody is confirmed.

## 3. Closing the table (one participant)

- When everybody is confirmed, anyone clicks **Close the table** and confirms the dialog. The order is now final
  for everyone at the table. If the button stays disabled, the message under it says who is still missing (see
  runbook RB-1).
- Open the group sheet (`/sheet`, or "Open the group sheet" in the Table tab). It must **not** show the
  Preview banner.

## 4. Printing the sheet

- Print the sheet from the browser of any node of the table; all nodes serve the same sheet once the table is
  closed. The print stylesheet puts the **kitchen tally on the first page**: quantity, dish name with its Chinese
  name, and options such as the spice level.
- The following pages show each participant's order with discounts and the amount paid on NoodlePay, the
  totals, and the **Allergens** section with the disclaimer.
- One sheet per group. Write the group's table name on top if several groups go together.

## 5. At the restaurant

- The trainer brings the printed sheets to **Happy Nouilles, 95 Rue Beaubourg, 75003 Paris**, and hands the
  kitchen tally to the staff.
- Point out the Allergens section and confirm any allergy **verbally** with the staff: the allergen data is
  inferred from the menu descriptions, not provided by the restaurant.
- Prices on the sheet are Uber Eats delivery prices; the restaurant's own prices apply. The **real bill is
  settled at the restaurant**; NoodlePay charges are fake and nothing needs to be reconciled with them.
