import { useState } from "react";
import type { Menu, MenuItem } from "../../../shared/menu";
import type { LineInput } from "../api";
import { AddDishDialog } from "./AddDishDialog";
import { DishCard } from "./DishCard";

interface MenuViewProps {
  menu: Menu;
  canOrder: boolean;
  onAdd: (line: LineInput) => void;
}

export function MenuView({ menu, canOrder, onAdd }: MenuViewProps) {
  const [picking, setPicking] = useState<MenuItem | null>(null);

  const add = (item: MenuItem) => {
    if (item.options?.length) setPicking(item);
    else onAdd({ itemId: item.id, quantity: 1, options: {} });
  };

  return (
    <div className="menu">
      <nav className="category-nav" aria-label="Menu categories">
        {menu.categories.map((c) => (
          <a key={c.id} href={`#cat-${c.id}`} className="chip">
            {c.name}
          </a>
        ))}
      </nav>
      {menu.categories.map((category) => (
        <section key={category.id} id={`cat-${category.id}`} className="category">
          <h2>{category.name}</h2>
          <div className="dish-grid">
            {category.items.map((item) => (
              <DishCard key={item.id} item={item} disabled={!canOrder} onAdd={add} />
            ))}
          </div>
        </section>
      ))}
      {menu.allergensDisclaimer && <p className="muted disclaimer">{menu.allergensDisclaimer}</p>}
      {picking && (
        <AddDishDialog
          item={picking}
          onClose={() => setPicking(null)}
          onAdd={(line) => {
            onAdd(line);
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}
