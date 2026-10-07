import type { Order, PeerSnapshot, PeerStatus, TableClosure } from "../../../shared/types";
import type { RegistryClient } from "../infra/registry-client";
import type { NodeStore } from "../state/node-store";
import { mergeOrders, pickClosure } from "./merge";
import { PeerClient, type Sender } from "./peer-client";

export interface SyncOptions {
  heartbeatMs: number;
  pullMs: number;
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Keeps this node in sync with the other nodes of its table:
 * registry heartbeat (discovery), push on change, periodic pull (catch-up).
 */
export class PeerSync {
  private readonly peers = new Map<string, PeerStatus>();
  private readonly registryState = { online: false, lastError: null as string | null };
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly store: NodeStore,
    private readonly registry: RegistryClient | null,
    private readonly client = new PeerClient(),
    private readonly options: SyncOptions = { heartbeatMs: 10_000, pullMs: 4_000 },
  ) {
    for (const [name, url] of Object.entries(store.state.knownPeers)) this.trackPeer(name, url);
  }

  get sender(): Sender {
    return { table: this.store.state.table.code, from: this.store.state.me };
  }

  peerStatuses(): PeerStatus[] {
    return [...this.peers.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /** We always reach ourselves; other participants when their node last answered. */
  readonly isReachable = (participant: string): boolean =>
    participant === this.store.state.me.name || this.peers.get(participant)?.online === true;

  registryStatus() {
    return { url: this.registry?.url ?? "(none)", ...this.registryState };
  }

  async start(): Promise<void> {
    await this.heartbeat();
    await this.pullAll();
    this.timers = [
      setInterval(() => void this.heartbeat(), this.options.heartbeatMs),
      setInterval(() => void this.pullAll(), this.options.pullMs),
    ];
  }

  async stop(): Promise<void> {
    this.timers.forEach(clearInterval);
    this.timers = [];
    await this.registry?.leave(this.sender.table, this.sender.from.name).catch(() => undefined);
  }

  trackPeer(name: string, url: string): void {
    if (name === this.store.state.me.name) return;
    const known = this.peers.get(name);
    if (known?.url === url) return;
    this.peers.set(name, { name, url, online: known?.online ?? false, lastContactAt: null, lastError: null });
    this.store.state.knownPeers[name] = url;
    void this.store.save();
  }

  async heartbeat(): Promise<void> {
    if (!this.registry) return;
    try {
      const peers = await this.registry.heartbeat(this.sender.table, this.sender.from);
      peers.forEach((p) => this.trackPeer(p.name, p.url));
      Object.assign(this.registryState, { online: true, lastError: null });
    } catch (error) {
      Object.assign(this.registryState, { online: false, lastError: errorMessage(error) });
    }
  }

  /** Push our own order to every known peer. */
  async broadcastOrder(order: Order): Promise<void> {
    await Promise.all(this.peerStatuses().map((p) => this.contact(p, () => this.client.pushOrders(p.url, this.sender, [order]))));
  }

  /** Pull every peer's state; also re-send the closure to peers that missed it. */
  async pullAll(): Promise<void> {
    await Promise.all(
      this.peerStatuses().map((p) =>
        this.contact(p, async () => {
          const snapshot = await this.client.fetchState(p.url, this.sender);
          this.receiveSnapshot(snapshot);
          const closure = this.store.state.closure;
          if (closure && !snapshot.closure) await this.client.sendClose(p.url, this.sender, closure, this.allOrders());
        }),
      ),
    );
  }

  async closeTable(closedBy: string, now: Date): Promise<TableClosure> {
    const closure = pickClosure(this.store.state.closure, { closedAt: now.toISOString(), closedBy })!;
    this.store.state.closure = closure;
    await this.store.save();
    const orders = this.allOrders();
    await Promise.all(this.peerStatuses().map((p) => this.contact(p, () => this.client.sendClose(p.url, this.sender, closure, orders))));
    return closure;
  }

  receiveOrders(from: Sender["from"], orders: Order[]) {
    this.trackPeer(from.name, from.url);
    const outcomes = mergeOrders(this.store.state.orders, orders, this.sender.table);
    if (outcomes.some((o) => o === "inserted" || o === "updated")) void this.store.save();
    return outcomes;
  }

  receiveClose(from: Sender["from"], closure: TableClosure, orders: Order[]): TableClosure {
    this.receiveOrders(from, orders);
    this.store.state.closure = pickClosure(this.store.state.closure, closure);
    void this.store.save();
    return this.store.state.closure!;
  }

  snapshot(): PeerSnapshot {
    return { ...this.sender, orders: this.allOrders(), closure: this.store.state.closure };
  }

  private receiveSnapshot(snapshot: PeerSnapshot): void {
    if (snapshot.table !== this.sender.table) throw new Error(`peer is at table ${snapshot.table}`);
    if (snapshot.closure) this.receiveClose(snapshot.from, snapshot.closure, snapshot.orders);
    else this.receiveOrders(snapshot.from, snapshot.orders);
  }

  private allOrders(): Order[] {
    return Object.values(this.store.state.orders);
  }

  private async contact(peer: PeerStatus, call: () => Promise<void>): Promise<void> {
    try {
      await call();
      Object.assign(peer, { online: true, lastContactAt: new Date().toISOString(), lastError: null });
    } catch (error) {
      Object.assign(peer, { online: false, lastError: errorMessage(error) });
    }
  }
}
