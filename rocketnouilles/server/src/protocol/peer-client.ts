import type { Order, PeerSnapshot, TableClosure } from "../../../shared/types";
import { requestJson } from "../infra/http";
import { SnapshotSchema } from "./schemas";

export interface Sender {
  table: string;
  from: { name: string; url: string };
}

/** HTTP calls a node makes to another node. All of them time out quickly. */
export class PeerClient {
  constructor(private readonly timeoutMs = 2500) {}

  async pushOrders(peerUrl: string, sender: Sender, orders: Order[]): Promise<void> {
    await requestJson(`${peerUrl}/peer/orders`, {
      method: "POST",
      body: { ...sender, orders },
      timeoutMs: this.timeoutMs,
    });
  }

  /** The query string tells the peer who is asking, so it can discover us too. */
  async fetchState(peerUrl: string, sender: Sender): Promise<PeerSnapshot> {
    const query = new URLSearchParams({ table: sender.table, name: sender.from.name, url: sender.from.url });
    const body = await requestJson<unknown>(`${peerUrl}/peer/state?${query}`, { timeoutMs: this.timeoutMs });
    return SnapshotSchema.parse(body);
  }

  async sendClose(peerUrl: string, sender: Sender, closure: TableClosure, orders: Order[]): Promise<void> {
    await requestJson(`${peerUrl}/peer/close`, {
      method: "POST",
      body: { ...sender, closure, orders },
      timeoutMs: this.timeoutMs,
    });
  }
}
