/** Domain types shared by the node (server/) and the UI (web/). */

export type OrderStatus = "DRAFT" | "PAID" | "CONFIRMED";

export interface OrderLine {
  lineId: string;
  itemId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  /** Chosen value per menu option id, e.g. { spice: "hot" }. */
  options: Record<string, string>;
}

export interface Discount {
  code: string;
  label: string;
  amountCents: number;
}

export interface Pricing {
  subtotalCents: number;
  discounts: Discount[];
  discountCents: number;
  totalCents: number;
  rejectedCodes: { code: string; reason: string }[];
}

export interface Payment {
  chargeId: string;
  type: "charge" | "payout";
  amountCents: number;
  cardLast4: string;
  paidAt: string;
}

export interface Order {
  orderId: string;
  table: string;
  participant: string;
  nodeUrl: string;
  /** Incremented by the owner node on every change. Highest version wins. */
  version: number;
  status: OrderStatus;
  lines: OrderLine[];
  promoCodes: string[];
  pricing: Pricing;
  payment: Payment | null;
  updatedAt: string;
}

export interface TableClosure {
  closedAt: string;
  closedBy: string;
}

export interface TableInfo {
  code: string;
  name: string;
}

export interface PeerStatus {
  name: string;
  url: string;
  online: boolean;
  lastContactAt: string | null;
  lastError: string | null;
}

/** What GET /peer/state returns: everything a peer needs to catch up. */
export interface PeerSnapshot {
  table: string;
  from: { name: string; url: string };
  orders: Order[];
  closure: TableClosure | null;
}

/** What GET /api/state returns to the UI. */
export interface TableView {
  table: TableInfo;
  me: { name: string; url: string };
  myOrder: Order;
  orders: Order[];
  peers: PeerStatus[];
  registry: { url: string; online: boolean; lastError: string | null };
  closure: TableClosure | null;
  canClose: boolean;
  closeBlockers: string[];
}

export interface CardInput {
  number: string;
  expiry: string;
  cvc: string;
}
