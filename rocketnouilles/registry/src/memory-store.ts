import { SEEDED_TABLES } from "./tables";
import type { PeerRecord, RegistryStore, TableInfo } from "./types";

/** In-memory store used by the local registry and the tests. */
export class MemoryRegistryStore implements RegistryStore {
  readonly kind = "memory";
  private readonly peers = new Map<string, Map<string, PeerRecord>>();

  constructor(private readonly tables: TableInfo[] = SEEDED_TABLES) {}

  async listTables(): Promise<TableInfo[]> {
    return [...this.tables];
  }

  async findTable(code: string): Promise<TableInfo | undefined> {
    return this.tables.find((t) => t.code === code);
  }

  async upsertPeer(tableCode: string, peer: { name: string; url: string }, now: Date): Promise<void> {
    const table = this.peersOf(tableCode);
    const existing = table.get(peer.name);
    table.set(peer.name, {
      name: peer.name,
      url: peer.url,
      joinedAt: existing?.joinedAt ?? now.toISOString(),
      lastSeenAt: now.toISOString(),
    });
  }

  async listPeers(tableCode: string, seenSince: Date): Promise<PeerRecord[]> {
    return [...this.peersOf(tableCode).values()]
      .filter((p) => new Date(p.lastSeenAt) >= seenSince)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async removePeer(tableCode: string, name: string): Promise<boolean> {
    return this.peersOf(tableCode).delete(name);
  }

  private peersOf(tableCode: string): Map<string, PeerRecord> {
    let table = this.peers.get(tableCode);
    if (!table) {
      table = new Map();
      this.peers.set(tableCode, table);
    }
    return table;
  }
}
