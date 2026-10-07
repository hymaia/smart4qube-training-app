import { formatEuros } from "../../../shared/money";
import type { MenuItem } from "../../../shared/menu";
import { photoUrl } from "../api";

interface DishCardProps {
  item: MenuItem;
  disabled: boolean;
  onAdd: (item: MenuItem) => void;
}

export function DishPhoto({ item }: { item: MenuItem }) {
  if (!item.photo) {
    return (
      <div className="dish-photo placeholder" aria-hidden="true">
        <span className="placeholder-icon">🍜</span>
        {item.nameZh && <span className="placeholder-zh">{item.nameZh}</span>}
      </div>
    );
  }
  return <img className="dish-photo" src={photoUrl(item.photo)} alt={item.name} loading="lazy" />;
}

export function DishCard({ item, disabled, onAdd }: DishCardProps) {
  return (
    <article className="dish-card">
      <DishPhoto item={item} />
      <div className="dish-body">
        <h3>
          {item.name}
          {item.nameZh && <span className="zh">{item.nameZh}</span>}
        </h3>
        {item.description && <p className="dish-description">{item.description}</p>}
        <div className="dish-tags">
          {item.tags.includes("spicy") && <span className="tag spicy">🌶 spicy</span>}
          {item.tags.includes("vegetarian") && <span className="tag veggie">🌱 veggie</span>}
          {item.allergens.length > 0 && <span className="tag allergens">⚠ {item.allergens.join(", ")}</span>}
        </div>
        <div className="dish-footer">
          <span className="price">
            {item.priceEstimated ? "≈ " : ""}
            {formatEuros(item.priceCents)}
          </span>
          <button type="button" className="button primary small" disabled={disabled} onClick={() => onAdd(item)}>
            Add
          </button>
        </div>
      </div>
    </article>
  );
}
