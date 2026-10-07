import { useEffect, useState, type FormEvent } from "react";
import type { Order } from "../../../shared/types";
import { api } from "../api";

interface PromoFieldProps {
  order: Order;
  editable: boolean;
  onChange: (codes: string[]) => Promise<void>;
}

export function PromoField({ order, editable, onChange }: PromoFieldProps) {
  const [code, setCode] = useState("");
  const [offers, setOffers] = useState<{ code: string; description: string }[]>([]);

  useEffect(() => {
    api.promos().then(setOffers).catch(() => setOffers([]));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    await onChange([...order.promoCodes, code.trim()]);
    setCode("");
  };

  const rejected = new Map(order.pricing.rejectedCodes.map((r) => [r.code, r.reason]));

  return (
    <div className="promo">
      {editable && (
        <form className="promo-form" onSubmit={submit}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Promo code"
            aria-label="Promo code"
            autoCapitalize="characters"
          />
          <button type="submit" className="button secondary small">Apply</button>
        </form>
      )}
      {order.promoCodes.length > 0 && (
        <ul className="promo-codes">
          {order.promoCodes.map((c) => (
            <li key={c} className={rejected.has(c) ? "rejected" : "applied"}>
              <span className="code-chip">{c}</span>
              <span className="promo-status">{rejected.has(c) ? `✗ ${rejected.get(c)}` : "✓ applied"}</span>
              {editable && (
                <button type="button" className="link-button" onClick={() => onChange(order.promoCodes.filter((x) => x !== c))}>
                  remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && offers.length > 0 && (
        <details className="offers">
          <summary>Current offers</summary>
          <ul>
            {offers.map((o) => (
              <li key={o.code}>
                <strong>{o.code}</strong> — {o.description}
              </li>
            ))}
            <li>
              <strong>Big table bonus</strong> — automatic when your table orders 8 noodle dishes or more.
            </li>
          </ul>
        </details>
      )}
    </div>
  );
}
