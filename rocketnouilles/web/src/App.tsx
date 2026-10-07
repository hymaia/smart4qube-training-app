import { useEffect, useState } from "react";
import type { Menu } from "../../shared/menu";
import { api, type LineInput } from "./api";
import { CartPanel } from "./components/CartPanel";
import { JoinScreen } from "./components/JoinScreen";
import { MenuView } from "./components/MenuView";
import { TablePanel } from "./components/TablePanel";
import { useTableView } from "./useTableView";

const JOINED_KEY = "rocketnouilles.joined";

function readJoined(): boolean {
  try {
    return sessionStorage.getItem(JOINED_KEY) === "1";
  } catch {
    return false;
  }
}

export function App() {
  const { view, error, refresh } = useTableView();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [joined, setJoined] = useState(readJoined);
  const [tab, setTab] = useState<"menu" | "table">("menu");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    api.menu().then(setMenu).catch((e) => setActionError(String(e)));
  }, []);

  if (!view || !menu) {
    return <main className="loading">{error ? `Cannot reach this node: ${error}` : "Loading…"}</main>;
  }

  if (!joined) {
    return (
      <JoinScreen
        view={view}
        menu={menu}
        onEnter={() => {
          try {
            sessionStorage.setItem(JOINED_KEY, "1");
          } catch {
            // private mode: the join screen will simply show again next time
          }
          setJoined(true);
        }}
      />
    );
  }

  /** Runs a mutation, then reloads the table state. */
  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
    await refresh();
  };

  const { myOrder, closure } = view;
  const canOrder = myOrder.status === "DRAFT" && !closure;
  const addLine = (line: LineInput) =>
    run(() => api.setLines([...myOrder.lines.map(({ itemId, quantity, options }) => ({ itemId, quantity, options })), line]));

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">🚀🍜 RocketNouilles</div>
        <div className="where">
          {menu.restaurant.name} · table <strong>{view.table.name}</strong> · you are <strong>{view.me.name}</strong>
        </div>
        <nav className="tabs">
          <button type="button" className={tab === "menu" ? "active" : ""} onClick={() => setTab("menu")}>
            Menu
          </button>
          <button type="button" className={tab === "table" ? "active" : ""} onClick={() => setTab("table")}>
            Table ({view.orders.length})
          </button>
        </nav>
      </header>

      {closure && (
        <div className="banner closed">
          Table closed by {closure.closedBy} at {new Date(closure.closedAt).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" })}.{" "}
          <a href="/sheet" target="_blank" rel="noreferrer">Open the group sheet →</a>
        </div>
      )}
      {error && <div className="banner warning">Connection problem: {error}</div>}
      {actionError && (
        <div className="banner error" role="alert">
          {actionError} <button type="button" className="link-button" onClick={() => setActionError(null)}>dismiss</button>
        </div>
      )}

      <div className="layout">
        <main className="content">
          {tab === "menu" ? (
            <MenuView menu={menu} canOrder={canOrder} onAdd={addLine} />
          ) : (
            <TablePanel view={view} onClose={async () => { await api.closeTable(); await refresh(); }} />
          )}
        </main>
        <CartPanel
          order={myOrder}
          tableClosed={closure !== null}
          onLinesChange={(lines) => run(() => api.setLines(lines))}
          onPromoChange={(codes) => run(() => api.setPromoCodes(codes))}
          onPaid={() => void refresh()}
          onConfirm={async () => {
            await api.confirm();
            await refresh();
            setTab("table");
          }}
        />
      </div>
    </div>
  );
}
