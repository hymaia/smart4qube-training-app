import type { Order, TableView } from "../../shared/types";

export const CARDS = {
  ok: { number: "4242 4242 4242 4242", expiry: "12/30", cvc: "123" },
  declined: { number: "4000 0000 0000 0002", expiry: "12/30", cvc: "123" },
};

export interface ApiResult<T> {
  status: number;
  body: T;
}

async function call<T>(url: string, method = "GET", body?: unknown): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: (text.startsWith("{") || text.startsWith("[") ? JSON.parse(text) : text) as T };
}

/** Thin client for one node's UI API, as used by the e2e script. */
export class NodeApi {
  constructor(
    readonly name: string,
    readonly url: string,
  ) {}

  state() {
    return call<TableView>(`${this.url}/api/state`).then((r) => r.body);
  }
  setLines(lines: { itemId: string; quantity: number; options?: Record<string, string> }[]) {
    return call<Order>(`${this.url}/api/order/lines`, "PUT", { lines });
  }
  setPromoCodes(codes: string[]) {
    return call<Order>(`${this.url}/api/order/promo-codes`, "PUT", { codes });
  }
  pay(card: { number: string; expiry: string; cvc: string }) {
    return call<Order & { error?: string }>(`${this.url}/api/order/pay`, "POST", { card });
  }
  confirm() {
    return call<Order>(`${this.url}/api/order/confirm`, "POST");
  }
  close() {
    return call<{ closedAt?: string; error?: string; message?: string }>(`${this.url}/api/table/close`, "POST");
  }
  sheet() {
    return fetch(`${this.url}/sheet`).then((r) => r.text());
  }
}
