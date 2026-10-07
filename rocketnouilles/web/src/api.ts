import type { Menu } from "../../shared/menu";
import type { CardInput, Order, OrderLine, TableClosure, TableView } from "../../shared/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.message ?? `HTTP ${response.status}`, response.status, data.error ?? "error");
  return data as T;
}

export type LineInput = Pick<OrderLine, "itemId" | "quantity" | "options">;

export const api = {
  menu: () => request<Menu>("/api/menu"),
  promos: () => request<{ code: string; description: string }[]>("/api/promos"),
  state: () => request<TableView>("/api/state"),
  setLines: (lines: LineInput[]) => request<Order>("/api/order/lines", "PUT", { lines }),
  setPromoCodes: (codes: string[]) => request<Order>("/api/order/promo-codes", "PUT", { codes }),
  pay: (card: CardInput, idempotencyKey: string) => request<Order>("/api/order/pay", "POST", { card, idempotencyKey }),
  confirm: () => request<Order>("/api/order/confirm", "POST"),
  closeTable: () => request<TableClosure>("/api/table/close", "POST"),
};

export const photoUrl = (photo: string) => `/menu/${photo}`;
