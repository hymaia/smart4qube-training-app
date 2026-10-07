import type { OrderLine } from "../../../shared/types";
import { HAPPY_HOUR, type PromoDefinition } from "./catalog";

export interface EligibilityInput {
  lines: OrderLine[];
  subtotalCents: number;
  now: Date;
}

/** Returns why a code does not apply to this cart, or null when it applies. */
export function ineligibilityReason(promo: PromoDefinition, input: EligibilityInput): string | null {
  if (input.lines.length === 0) return "Your cart is empty";

  if (promo.minSubtotalCents !== undefined && input.subtotalCents < promo.minSubtotalCents) {
    return `Requires an order of at least ${promo.minSubtotalCents / 100} €`;
  }
  if (promo.kind === "happy-hour" && !isHappyHour(input.now)) {
    return `Only valid from ${HAPPY_HOUR.startHour}:00 to ${HAPPY_HOUR.endHour}:00`;
  }
  if (promo.kind === "free-item" && !input.lines.some((l) => l.itemId === promo.itemId)) {
    return "Add the offered dish to your cart first";
  }
  return null;
}

export function isHappyHour(now: Date): boolean {
  const hour = now.getUTCHours();
  return hour >= HAPPY_HOUR.startHour && hour < HAPPY_HOUR.endHour;
}
