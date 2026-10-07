# NoodlePay — mock payment provider

A tiny fake PSP. No money moves, ever. Start it with `npm run psp` (port 4900, `PORT` to override).
Every RocketNouilles node also mounts an embedded copy under `/psp`, so participants don't need to run it.

## API

`POST /charges`

```json
{ "amountCents": 1350, "currency": "EUR", "description": "RAMEN / Alice",
  "idempotencyKey": "b6c1…", "card": { "number": "4242 4242 4242 4242", "expiry": "12/30", "cvc": "123" } }
```

- `201` → `{ id, object: "charge", type, status: "succeeded", amountCents, currency, cardLast4, … }`
- `402` → same shape with `status: "declined"`, `failureCode`, `failureMessage`
- `504` → `{ error: "timeout" }` (no charge is created)
- `400` → malformed request

`GET /charges/:id` returns a stored charge. `GET /health` is a liveness probe.

**Idempotency**: sending the same `idempotencyKey` again returns the original charge (same id, same status), whatever the new body says.

**Amounts**: NoodlePay trusts its merchant. It accepts any finite number. A negative amount is a refund to the
card holder: the charge comes back with `"type": "payout"` and `status: "succeeded"`.

## Test cards

Any future expiry (e.g. `12/30`) and any 3-digit CVC.

| Card number           | Result                                   |
| --------------------- | ---------------------------------------- |
| `4242 4242 4242 4242` | succeeds                                 |
| `4000 0000 0000 0002` | declined — `card_declined`               |
| `4000 0000 0000 9995` | declined — `insufficient_funds`          |
| `4000 0000 0000 0119` | hangs ~15 s, then `504` timeout          |
| any other Luhn-valid  | succeeds                                 |
| not Luhn-valid        | declined — `incorrect_number`            |
| past expiry           | declined — `expired_card`                |
