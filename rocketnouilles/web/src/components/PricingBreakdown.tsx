import { formatEuros } from "../../../shared/money";
import type { Pricing } from "../../../shared/types";

export function PricingBreakdown({ pricing }: { pricing: Pricing }) {
  return (
    <dl className="breakdown">
      <div>
        <dt>Subtotal</dt>
        <dd>{formatEuros(pricing.subtotalCents)}</dd>
      </div>
      {pricing.discounts.map((d) => (
        <div key={d.code} className="discount">
          <dt>
            <span className="code-chip">{d.code}</span> {d.label}
          </dt>
          <dd>−{formatEuros(d.amountCents)}</dd>
        </div>
      ))}
      <div className="total">
        <dt>Total</dt>
        <dd>{formatEuros(pricing.totalCents)}</dd>
      </div>
    </dl>
  );
}
