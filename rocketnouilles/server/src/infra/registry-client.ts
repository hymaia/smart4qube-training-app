import type { TableInfo } from "../../../shared/types";
import { requestJson } from "./http";

export interface RegistryPeer {
  name: string;
  url: string;
  lastSeenAt: string;
}

/** Client for the peer registry (Netlify in production, registry:local offline). */
export class RegistryClient {
  constructor(private readonly baseUrl: string) {}

  get url(): string {
    return this.baseUrl;
  }

  async listTables(): Promise<TableInfo[]> {
    const body = await requestJson<{ tables: TableInfo[] }>(`${this.baseUrl}/api/tables`, { timeoutMs: 8000 });
    return body.tables;
  }

  /** Join or heartbeat: upserts this node and returns the table's live peers. */
  async heartbeat(table: string, me: { name: string; url: string }): Promise<RegistryPeer[]> {
    const body = await requestJson<{ peers: RegistryPeer[] }>(this.peersUrl(table), {
      method: "POST",
      body: me,
      timeoutMs: 8000,
    });
    return body.peers;
  }

  async leave(table: string, name: string): Promise<void> {
    await requestJson(`${this.peersUrl(table)}/${encodeURIComponent(name)}`, { method: "DELETE", timeoutMs: 3000 });
  }

  private peersUrl(table: string): string {
    return `${this.baseUrl}/api/tables/${encodeURIComponent(table)}/peers`;
  }
}
