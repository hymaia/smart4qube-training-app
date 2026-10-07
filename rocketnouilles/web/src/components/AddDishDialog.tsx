import { useState } from "react";
import { formatEuros } from "../../../shared/money";
import type { MenuItem } from "../../../shared/menu";
import type { LineInput } from "../api";
import { DishPhoto } from "./DishCard";
import { Modal } from "./Modal";

interface AddDishDialogProps {
  item: MenuItem;
  onAdd: (line: LineInput) => void;
  onClose: () => void;
}

const SPICE_ICONS: Record<string, string> = { mild: "🌶", medium: "🌶🌶", hot: "🌶🌶🌶" };

export function AddDishDialog({ item, onAdd, onClose }: AddDishDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState<Record<string, string>>(
    Object.fromEntries((item.options ?? []).map((o) => [o.id, o.choices[0]])),
  );

  return (
    <Modal title={item.name} onClose={onClose}>
      <div className="modal-body add-dish">
        <DishPhoto item={item} />
        {item.description && <p className="dish-description">{item.description}</p>}
        {(item.options ?? []).map((option) => (
          <fieldset key={option.id} className="option-group">
            <legend>{option.name}</legend>
            {option.choices.map((choice) => (
              <label key={choice} className={`choice ${options[option.id] === choice ? "selected" : ""}`}>
                <input
                  type="radio"
                  name={option.id}
                  value={choice}
                  checked={options[option.id] === choice}
                  onChange={() => setOptions({ ...options, [option.id]: choice })}
                />
                {choice} {option.id === "spice" ? SPICE_ICONS[choice] ?? "" : ""}
              </label>
            ))}
          </fieldset>
        ))}
        <div className="quantity-row">
          <span>Quantity</span>
          <div className="stepper">
            <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Less">−</button>
            <span aria-live="polite">{quantity}</span>
            <button type="button" onClick={() => setQuantity(Math.min(20, quantity + 1))} aria-label="More">+</button>
          </div>
        </div>
      </div>
      <footer className="modal-actions">
        <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="button primary" onClick={() => onAdd({ itemId: item.id, quantity, options })}>
          Add to cart · {formatEuros(item.priceCents * quantity)}
        </button>
      </footer>
    </Modal>
  );
}
