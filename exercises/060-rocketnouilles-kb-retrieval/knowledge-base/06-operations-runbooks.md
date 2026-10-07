---
title: Operations runbooks
owner: Training-day coordinator (on-call trainer)
updated: 2026-10-01
status: current
audience: trainers, participants
---

# Operations runbooks

Each runbook starts from a symptom seen in the UI. The **Table** tab shows every participant with an
online/offline dot, their status, and at the bottom the registry state ("Registry: connected" or
"Registry: unreachable (…)").

## RB-1 — A peer shows as offline

**Symptom.** A participant has a grey dot and "· offline" in the Table tab, or "Close the table" stays disabled
with "Waiting for … to confirm".

1. Remember that a peer is marked offline as soon as one call to it fails (2.5-second timeout) and is retried
   on every pull cycle (every 4 seconds). A short Wi-Fi hiccup heals by itself.
2. Check that both laptops are on the **same network** and that the firewall accepts incoming connections on the
   node port (default `4001`).
3. If the laptop has several network interfaces, the advertised URL may be wrong. Restart the node with
   `--public-url http://<reachable-ip>:<port>`. The node re-announces its new URL to the table.
4. If the node crashed or the laptop was closed, restart it **with the same `--name` and `--table`** (and the
   same `--data-dir` if one was used). The state in `data/<TABLE>-<name>.json` is restored and the next pull
   catches up with everything that happened meanwhile, including orders of people who are now offline.
5. If the participant cannot come back: when their cart is **empty**, they no longer block the close. When their
   cart has **dishes**, the table cannot be closed without them; nobody else can confirm for them. Bring the
   laptop back, or copy their state file to another laptop and start a node there with the same name and table.

## RB-2 — Group sheets differ between laptops

**Symptom.** Two people print `/sheet` and the sheets are not the same.

1. Look for the **Preview** banner. A sheet marked Preview comes from a node that has not received the closure
   yet. Wait for the next pull: the closer re-sends the closure to any peer that does not have it.
2. Check both nodes are on the **same table code**. Nodes of different tables never exchange orders
   (`409 wrong_table`).
3. Check both laptops run the same RocketNouilles version: the sheet also depends on `menu.json` (dish names,
   Chinese names, allergens). Different menu files give different sheets.
4. Once the table is closed and the nodes have synchronised, sheets are byte-identical. Print from any node.

## RB-3 — A payment is declined or times out

**Symptom.** The checkout dialog shows an error after clicking *Pay with NoodlePay*.

1. Read the message. "Your card was declined.", "Your card has insufficient funds.", "Your card number is
   incorrect." and "Your card has expired." are deliberate test-card outcomes (see the NoodlePay document).
2. The order **stays in DRAFT**. Nothing was frozen and the participant can still change the cart.
3. Retry with the success card `4242 4242 4242 4242`, any future expiry and any CVC.
4. "The payment provider timed out. You were not charged." means NoodlePay answered `504` and **no charge was
   created**. Retrying is safe: there is no double payment.
5. "Payment provider unavailable (…)" means the node could not reach NoodlePay. If the node was started with
   `--psp <url>`, check that URL or restart without `--psp` to use the embedded NoodlePay.

## RB-4 — The registry is down

**Symptom.** "Registry: unreachable" at the bottom of the Table tab, or new participants see nobody.

1. Check `curl https://rocket-nouilles-registry.netlify.app/api/health`. A healthy registry answers
   `{ "ok": true, "service": "rocket-nouilles-registry", "storage": "netlify-database", … }`.
2. Nodes that already know each other **keep working**: known peers are stored in each state file and pulls
   continue. Orders, payments, confirmations and the close do not need the registry.
3. A node started while the registry is unreachable still starts (it logs a warning and shows the table code
   instead of the table name).
4. New participants cannot discover the table without a registry. Fallback: the trainer runs
   `npm run registry:local` (in-memory registry on port `4800`) and everyone restarts their node with
   `--registry http://<trainer-ip>:4800`.
5. Redeploying the Netlify registry is done with `registry/deploy.sh` (Netlify CLI, logged in to the team).
