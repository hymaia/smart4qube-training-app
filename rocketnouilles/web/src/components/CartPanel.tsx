import { useState } from "react";
import { formatEuros } from "../../../shared/money";
import type { Order, OrderLine } from "../../../shared/types";
import type { LineInput } from "../api";
import { CheckoutDialog } from "./CheckoutDialog";
import { ConfirmDialog } from "./Modal";
import { PricingBreakdown } from "./PricingBreakdown";
import { PromoField } from "./PromoField";

interface CartPanelProps {
  order: Order;
  tableClosed: boolean;
  onLinesChange: (lines: LineInput[]) => Promise<void>;
  onPromoChange: (codes: string[]) => Promise<void>;
  onPaid: () => void;
  onConfirm: () => Promise<void>;
}

const toInput = (l: OrderLine): LineInput => ({ itemId: l.itemId, quantity: l.quantity, options: l.options });

export function CartPanel({ order, tableClosed, onLinesChange, onPromoChange, onPaid, onConfirm }: CartPanelProps) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const editable = order.status === "DRAFT" && !tableClosed;

  const changeQuantity = (line: OrderLine, delta: number) =>
    onLinesChange(
      order.lines
        .map((l) => (l.lineId === line.lineId ? { ...toInput(l), quantity: l.quantity + delta } : toInput(l)))
        .filter((l) => l.quantity > 0),
    );

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="cart" aria-label="Your order">
      <h2>
        Your order <span className={`status-badge ${order.status.toLowerCase()}`}>{order.status}</span>
      </h2>
      {order.lines.length === 0 && order.status === "DRAFT" && (
        <p className="muted">
          Your cart is empty. Pick something tasty!
          {!tableClosed && (
            <>
              {" "}Not eating this time?{" "}
              <button type="button" className="link-button" onClick={() => setConfirming(true)}>
                Confirm without ordering
              </button>
            </>
          )}
        </p>
      )}
      {order.lines.length === 0 && order.status === "CONFIRMED" && <p className="muted">You're not ordering this time.</p>}
      <ul className="cart-lines">
        {order.lines.map((line) => (
          <li key={line.lineId}>
            <div className="line-main">
              <span className="line-name">{line.name}</span>
              {Object.entries(line.options).map(([k, v]) => (
                <span key={k} className="line-option">{k}: {v}</span>
              ))}
            </div>
            <div className="line-controls">
              {editable ? (
                <div className="stepper small">
                  <button type="button" onClick={() => changeQuantity(line, -1)} aria-label={`One less ${line.name}`}>−</button>
                  <span>{line.quantity}</span>
                  <button type="button" onClick={() => changeQuantity(line, +1)} aria-label={`One more ${line.name}`}>+</button>
                </div>
              ) : (
                <span>{line.quantity}×</span>
              )}
              <span className="line-price">{formatEuros(line.unitPriceCents * line.quantity)}</span>
            </div>
          </li>
        ))}
      </ul>

      {order.lines.length > 0 && (
        <>
          <PromoField order={order} editable={editable} onChange={onPromoChange} />
          <PricingBreakdown pricing={order.pricing} />
        </>
      )}

      {editable && order.lines.length > 0 && (
        <button type="button" className="button primary wide" onClick={() => setCheckingOut(true)}>
          Checkout · {formatEuros(order.pricing.totalCents)}
        </button>
      )}

      {order.payment && (
        <p className={`receipt ${order.payment.type}`}>
          {order.payment.type === "payout"
            ? `NoodlePay paid you ${formatEuros(-order.payment.amountCents)} (card •••• ${order.payment.cardLast4})`
            : `Paid ${formatEuros(order.payment.amountCents)} with card •••• ${order.payment.cardLast4}`}
        </p>
      )}

      {order.status === "PAID" && !tableClosed && (
        <button type="button" className="button primary wide" onClick={() => setConfirming(true)}>
          Confirm my order
        </button>
      )}
      {order.status === "CONFIRMED" && !tableClosed && (
        <p className="notice">Confirmed ✓ Waiting for the rest of the table.</p>
      )}

      {checkingOut && (
        <CheckoutDialog
          order={order}
          onClose={() => setCheckingOut(false)}
          onPaid={() => {
            setCheckingOut(false);
            onPaid();
          }}
        />
      )}
      {confirming && (
        <ConfirmDialog
          title={order.lines.length ? "Confirm your order?" : "Confirm without ordering?"}
          message={
            <p>
              {order.lines.length
                ? "Your order goes on the group sheet for the kitchen."
                : "You won't have anything on the group sheet."}{" "}
              You won't be able to change it afterwards.
            </p>
          }
          confirmLabel={order.lines.length ? "Yes, confirm my order" : "Yes, nothing for me"}
          busy={busy}
          onConfirm={confirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </aside>
  );
}
