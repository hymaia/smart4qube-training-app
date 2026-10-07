/** Behaviour of NoodlePay test cards. Any other Luhn-valid number succeeds. */
export type CardOutcome =
  | { kind: "succeed" }
  | { kind: "decline"; code: "card_declined" | "insufficient_funds" | "incorrect_number" | "expired_card" }
  | { kind: "timeout" };

export const TEST_CARDS: Record<string, CardOutcome> = {
  "4242424242424242": { kind: "succeed" },
  "4000000000000002": { kind: "decline", code: "card_declined" },
  "4000000000009995": { kind: "decline", code: "insufficient_funds" },
  "4000000000000119": { kind: "timeout" },
};

export const DECLINE_MESSAGES: Record<string, string> = {
  card_declined: "Your card was declined.",
  insufficient_funds: "Your card has insufficient funds.",
  incorrect_number: "Your card number is incorrect.",
  expired_card: "Your card has expired.",
};

export function normalizeCardNumber(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

export function isLuhnValid(digits: string): boolean {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Expiry is "MM/YY". A card is valid until the end of its expiry month. */
export function isExpired(expiry: string, now: Date): boolean {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(expiry.trim());
  if (!match) return true;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return true;
  return new Date(Date.UTC(year, month, 1)) <= now;
}

export function outcomeFor(number: string, expiry: string, now: Date): CardOutcome {
  const digits = normalizeCardNumber(number);
  const known = TEST_CARDS[digits];
  if (known) return isExpired(expiry, now) ? { kind: "decline", code: "expired_card" } : known;
  if (!isLuhnValid(digits)) return { kind: "decline", code: "incorrect_number" };
  if (isExpired(expiry, now)) return { kind: "decline", code: "expired_card" };
  return { kind: "succeed" };
}
