import { useState } from "react";
import { formatEuros } from "../../../shared/money";
import type { TableView } from "../../../shared/types";
import { ConfirmDialog } from "./Modal";

interface TablePanelProps {
  view: TableView;
  onClose: () => Promise<void>;
}

export function TablePanel({ view, onClose }: TablePanelProps) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = new Map(view.peers.map((p) => [p.name, p.online]));
  const knownPeersWithoutOrder = view.peers.filter((p) => !view.orders.some((o) => o.participant === p.name));

  const close = async () => {
    setBusy(true);
    setError(null);
    try {
      await onClose();
      setAsking(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="table-panel">
      <h2>
        {view.table.name} <span className="code-chip">{view.table.code}</span>
      </h2>
      <ul className="participants">
        {view.orders.map((order) => {
          const isMe = order.participant === view.me.name;
          const isOnline = isMe || online.get(order.participant) === true;
          return (
            <li key={order.participant} className="participant-card">
              <header>
                <span className={`presence ${isOnline ? "online" : "offline"}`} title={isOnline ? "online" : "offline"} />
                <strong>{order.participant}</strong>
                {isMe && <span className="muted"> (you)</span>}
                {!isOnline && <span className="muted"> · offline</span>}
                <span className={`status-badge ${order.status.toLowerCase()}`}>{order.status}</span>
              </header>
              {order.lines.length === 0 ? (
                <p className="muted">{order.status === "CONFIRMED" ? "Not ordering this time." : "Still browsing the menu…"}</p>
              ) : (
                <ul className="mini-lines">
                  {order.lines.map((l) => (
                    <li key={l.lineId}>
                      {l.quantity}× {l.name}
                      {l.options.spice ? ` (${l.options.spice})` : ""}
                    </li>
                  ))}
                </ul>
              )}
              {order.lines.length > 0 && (
                <p className="participant-total">
                  {order.payment ? `Paid ${formatEuros(order.payment.amountCents)}` : `Cart ${formatEuros(order.pricing.totalCents)}`}
                </p>
              )}
            </li>
          );
        })}
        {knownPeersWithoutOrder.map((p) => (
          <li key={p.name} className="participant-card">
            <header>
              <span className={`presence ${p.online ? "online" : "offline"}`} />
              <strong>{p.name}</strong>
              <span className="muted"> · connecting…</span>
            </header>
          </li>
        ))}
      </ul>

      {view.closure ? (
        <p className="notice">This table is closed.</p>
      ) : (
        <div className="close-area">
          <button type="button" className="button danger wide" disabled={!view.canClose} onClick={() => setAsking(true)}>
            Close the table
          </button>
          {!view.canClose && (
            <p className="muted">
              {view.closeBlockers.length > 0
                ? `Waiting for ${view.closeBlockers.join(", ")} to confirm.`
                : "At least one confirmed order is needed."}
            </p>
          )}
        </div>
      )}
      <a className="button secondary wide" href="/sheet" target="_blank" rel="noreferrer">
        {view.closure ? "Open the group sheet" : "Preview the group sheet"}
      </a>
      <p className="muted small">
        Registry: {view.registry.online ? "connected" : `unreachable${view.registry.lastError ? ` (${view.registry.lastError})` : ""}`}
      </p>

      {asking && (
        <ConfirmDialog
          title="Close the table?"
          message={
            <>
              <p>Close the table for everyone? No more changes.</p>
              {error && <p className="error" role="alert">{error}</p>}
            </>
          }
          confirmLabel="Close the table"
          danger
          busy={busy}
          onConfirm={close}
          onCancel={() => setAsking(false)}
        />
      )}
    </section>
  );
}
