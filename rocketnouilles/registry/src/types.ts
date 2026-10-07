export interface TableInfo {
  code: string;
  name: string;
}

export interface PeerRecord {
  name: string;
  url: string;
  joinedAt: string;
  lastSeenAt: string;
}

/** Storage port used by the registry handlers (Postgres in production, memory locally). */
export interface RegistryStore {
  readonly kind: string;
  listTables(): Promise<TableInfo[]>;
  findTable(code: string): Promise<TableInfo | undefined>;
  upsertPeer(tableCode: string, peer: { name: string; url: string }, now: Date): Promise<void>;
  listPeers(tableCode: string, seenSince: Date): Promise<PeerRecord[]>;
  removePeer(tableCode: string, name: string): Promise<boolean>;
}

export interface RegistryRequest {
  method: string;
  path: string;
  body?: unknown;
}

export interface RegistryResponse {
  status: number;
  body: unknown;
}
