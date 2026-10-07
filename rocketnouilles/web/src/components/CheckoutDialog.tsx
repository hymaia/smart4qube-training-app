import { useState, type FormEvent } from "react";
import { formatEuros } from "../../../shared/money";
import type { CardInput, Order } from "../../../shared/types";
import { api } from "../api";
import { Modal } from "./Modal";

const TEST_CARDS = [
  { number: "4242 4242 4242 4242", label: "✅ succeeds" },
  { number: "4000 0000 0000 0002", label: "❌ declined" },
  { number: "4000 0000 0000 9995", label: "💸 insufficient funds" },
  { number: "4000 0000 0000 0119", label: "⏳ times out (15 s)" },
];

/** crypto.randomUUID only exists on secure origins (https, localhost). */
function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

interface CheckoutDialogProps {
  order: Order;
  onPaid: (order: Order) => void;
  onClose: () => void;
}

export function CheckoutDialog({ order, onPaid, onClose }: CheckoutDialogProps) {
  const [card, setCard] = useState<CardInput>({ number: "", expiry: "12/30", cvc: "123" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onPaid(await api.pay(card, newIdempotencyKey()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Pay with NoodlePay" onClose={busy ? () => undefined : onClose}>
      <form onSubmit={submit}>
        <div className="modal-body checkout">
          <p className="amount">
            Amount: <strong>{formatEuros(order.pricing.totalCents)}</strong>
          </p>
          <label>
            Card number
            <input
              required
              inputMode="numeric"
              autoComplete="off"
              value={card.number}
              onChange={(e) => setCard({ ...card, number: e.target.value })}
              placeholder="4242 4242 4242 4242"
            />
          </label>
          <div className="row">
            <label>
              Expiry (MM/YY)
              <input required value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
            </label>
            <label>
              CVC
              <input required inputMode="numeric" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} />
            </label>
          </div>
          <div className="test-cards">
            <span className="muted">Fake money only. Test cards:</span>
            {TEST_CARDS.map((t) => (
              <button key={t.number} type="button" className="link-button" onClick={() => setCard({ ...card, number: t.number })}>
                {t.number} {t.label}
              </button>
            ))}
          </div>
          {busy && <p className="notice">Contacting NoodlePay…</p>}
          {error && <p className="error" role="alert">Payment failed: {error}</p>}
        </div>
        <footer className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? "Paying…" : `Pay ${formatEuros(order.pricing.totalCents)}`}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
