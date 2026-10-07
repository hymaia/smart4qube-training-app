import { FIXED_AMOUNT_KINDS, MAX_CODES_PER_ORDER, findPromo, normalizeCode, type PromoDefinition } from "./catalog";
import type { TableAggregate } from "./table";

export interface StackingResult {
  accepted: PromoDefinition[];
  rejected: { code: string; reason: string }[];
}

/** Applies the stacking policy: which of the entered codes may be combined. */
export function resolveStack(rawCodes: string[], participant: string, table: TableAggregate): StackingResult {
  const accepted: PromoDefinition[] = [];
  const rejected: StackingResult["rejected"] = [];
  const usedAtTable = table.codesUsedBy(participant);

  for (const code of [...new Set(rawCodes.map(normalizeCode).filter(Boolean))]) {
    const promo = findPromo(code);
    const reason = !promo ? "Unknown code" : stackingConflict(promo, accepted, usedAtTable);
    if (promo && !reason) accepted.push(promo);
    else rejected.push({ code, reason: reason ?? "Unknown code" });
  }
  return { accepted, rejected };
}

function stackingConflict(promo: PromoDefinition, accepted: PromoDefinition[], usedAtTable: Set<string>): string | null {
  if (accepted.length >= MAX_CODES_PER_ORDER) return `At most ${MAX_CODES_PER_ORDER} codes per order`;
  if (promo.oncePerTable && usedAtTable.has(promo.code)) return "Already used by someone at your table";

  const clash = accepted.find(
    (other) => promo.notCombinableWith?.includes(other.code) || other.notCombinableWith?.includes(promo.code),
  );
  if (clash) return `Cannot be combined with ${clash.code}`;

  if (FIXED_AMOUNT_KINDS.includes(promo.kind)) {
    const otherFixed = accepted.find((other) => FIXED_AMOUNT_KINDS.includes(other.kind));
    if (otherFixed) return `Only one fixed-amount code per order (${otherFixed.code} already applied)`;
  }
  return null;
}
