import type { Menu } from "../../../shared/menu";
import type { TableView } from "../../../shared/types";
import { photoUrl } from "../api";

interface JoinScreenProps {
  view: TableView;
  menu: Menu;
  onEnter: () => void;
}

export function JoinScreen({ view, menu, onEnter }: JoinScreenProps) {
  const others = view.peers.map((p) => p.name);
  return (
    <main className="join">
      {menu.restaurant.photo && <img className="join-hero" src={photoUrl(menu.restaurant.photo)} alt={menu.restaurant.name} />}
      <div className="join-card">
        <p className="brand">🚀🍜 RocketNouilles</p>
        <h1>Hi {view.me.name}!</h1>
        <p>
          You're at table <strong>{view.table.name}</strong> <span className="code-chip">{view.table.code}</span>, ordering
          from <strong>{menu.restaurant.name}</strong>, {menu.restaurant.address}.
        </p>
        <p className="muted">
          {others.length > 0 ? `Already at the table: ${others.join(", ")}.` : "Nobody else has joined yet, others will show up here."}
        </p>
        <button type="button" className="button primary wide" onClick={onEnter}>
          Let's order
        </button>
      </div>
    </main>
  );
}
