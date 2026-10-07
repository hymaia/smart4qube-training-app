import { formatEuros } from "../../../shared/money";
import type { Menu } from "../../../shared/menu";
import type { Order, TableClosure, TableInfo } from "../../../shared/types";
import { lineTotalCents } from "../pricing/cart";
import { SHEET_CSS } from "./sheet-style";
import { buildGroupSheet, describeOptions, type GroupSheetData } from "./group-sheet";

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const parisDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  dateStyle: "full",
  timeStyle: "short",
});

export interface SheetInput {
  menu: Menu;
  table: TableInfo;
  orders: Order[];
  closure: TableClosure | null;
}

/** The printable group sheet. Same input => byte-identical HTML on every node. */
export function renderSheet({ menu, table, orders, closure }: SheetInput): string {
  const sheet = buildGroupSheet(orders, menu);
  const { restaurant } = menu;
  const status = closure
    ? `Closed on ${escape(parisDateTime.format(new Date(closure.closedAt)))} by ${escape(closure.closedBy)}`
    : `<strong>Preview</strong> — the table is still open, this sheet is not final.`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Group sheet — ${escape(table.name)}</title>
<style>${SHEET_CSS}</style>
</head>
<body>
<main class="sheet${closure ? "" : " preview"}">
  <header>
    <h1>${escape(restaurant.name)}</h1>
    <p>${escape(restaurant.address)}${restaurant.phone ? ` · ${escape(restaurant.phone)}` : ""}</p>
    <h2>Table ${escape(table.name)} <span class="code">${escape(table.code)}</span></h2>
    <p class="status">${status}</p>
  </header>
  ${renderTally(sheet)}
  <section>
    <h3>Orders (${sheet.orders.length} participants)</h3>
    ${sheet.orders.map(renderOrder).join("\n")}
    <p class="grand-total">Table total paid: <strong>${formatEuros(sheet.totalPaidCents)}</strong>
      <span class="muted">(menu prices: ${formatEuros(sheet.subtotalCents)})</span></p>
  </section>
  ${renderAllergens(sheet, menu.allergensDisclaimer ?? null)}
  <footer>RocketNouilles · payments are simulated by NoodlePay — the bill is settled at the restaurant</footer>
</main>
</body>
</html>
`;
}

function renderTally(sheet: GroupSheetData): string {
  const rows = sheet.tally
    .map(
      (t) => `<tr><td class="qty">${t.quantity}×</td><td>${escape(t.name)}${t.nameZh ? ` <span class="zh">${escape(t.nameZh)}</span>` : ""}</td><td>${escape(t.options)}</td></tr>`,
    )
    .join("\n");
  const count = sheet.tally.reduce((sum, t) => sum + t.quantity, 0);
  return `<section class="kitchen">
    <h3>For the kitchen — ${count} items</h3>
    <table><thead><tr><th>Qty</th><th>Dish</th><th>Options</th></tr></thead><tbody>${rows}</tbody></table>
  </section>`;
}

function renderOrder(order: Order): string {
  const lines = order.lines
    .map(
      (l) => `<tr><td class="qty">${l.quantity}×</td><td>${escape(l.name)}${
        Object.keys(l.options).length ? ` <span class="muted">(${escape(describeOptions(l.options))})</span>` : ""
      }</td><td class="num">${formatEuros(l.unitPriceCents)}</td><td class="num">${formatEuros(lineTotalCents(l))}</td></tr>`,
    )
    .join("\n");
  const discounts = order.pricing.discounts
    .map((d) => `<tr class="discount"><td></td><td>${escape(d.code)} — ${escape(d.label)}</td><td></td><td class="num">−${formatEuros(d.amountCents)}</td></tr>`)
    .join("\n");
  const paid = order.payment ? formatEuros(order.payment.amountCents) : "not paid";
  return `<article class="participant">
    <h4>${escape(order.participant)}</h4>
    <table><tbody>${lines}${discounts}
      <tr class="total"><td></td><td>Total paid${order.payment ? ` (card •••• ${escape(order.payment.cardLast4)})` : ""}</td><td></td><td class="num">${paid}</td></tr>
    </tbody></table>
  </article>`;
}

function renderAllergens(sheet: GroupSheetData, disclaimer: string | null): string {
  const items = sheet.allergens
    .map((a) => `<li><strong>${escape(a.allergen)}</strong>: ${a.participants.map(escape).join(", ")}</li>`)
    .join("\n");
  return `<section class="allergens">
    <h3>Allergens</h3>
    <ul>${items || "<li>None declared</li>"}</ul>
    ${disclaimer ? `<p class="muted">${escape(disclaimer)}</p>` : ""}
  </section>`;
}
