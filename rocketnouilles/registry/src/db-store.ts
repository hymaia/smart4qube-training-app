import { getDatabase } from "@netlify/database";
import type { PeerRecord, RegistryStore, TableInfo } from "./types";

interface PeerRow {
  name: string;
  url: string;
  joined_at: Date | string;
  last_seen_at: Date | string;
}

const iso = (value: Date | string) => new Date(value).toISOString();

/** Netlify Database (Postgres) store. Schema lives in netlify/database/migrations. */
export class NetlifyDbRegistryStore implements RegistryStore {
  readonly kind = "netlify-database";
  private readonly db = getDatabase();

  async listTables(): Promise<TableInfo[]> {
    return this.db.sql<TableInfo>`SELECT code, name FROM noodle_tables ORDER BY position`;
  }

  async findTable(code: string): Promise<TableInfo | undefined> {
    const rows = await this.db.sql<TableInfo>`SELECT code, name FROM noodle_tables WHERE code = ${code}`;
    return rows[0];
  }

  async upsertPeer(tableCode: string, peer: { name: string; url: string }, now: Date): Promise<void> {
    await this.db.sql`
      INSERT INTO peers (table_code, name, url, joined_at, last_seen_at)
      VALUES (${tableCode}, ${peer.name}, ${peer.url}, ${now.toISOString()}, ${now.toISOString()})
      ON CONFLICT (table_code, name)
      DO UPDATE SET url = EXCLUDED.url, last_seen_at = EXCLUDED.last_seen_at`;
  }

  async listPeers(tableCode: string, seenSince: Date): Promise<PeerRecord[]> {
    const rows = await this.db.sql<PeerRow>`
      SELECT name, url, joined_at, last_seen_at FROM peers
      WHERE table_code = ${tableCode} AND last_seen_at >= ${seenSince.toISOString()}
      ORDER BY name`;
    return rows.map((r) => ({ name: r.name, url: r.url, joinedAt: iso(r.joined_at), lastSeenAt: iso(r.last_seen_at) }));
  }

  async removePeer(tableCode: string, name: string): Promise<boolean> {
    const rows = await this.db.sql<{ name: string }>`
      DELETE FROM peers WHERE table_code = ${tableCode} AND name = ${name} RETURNING name`;
    return rows.length > 0;
  }
}
