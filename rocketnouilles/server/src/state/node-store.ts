import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Order, TableClosure, TableInfo } from "../../../shared/types";

export interface NodeState {
  table: TableInfo;
  me: { name: string; url: string };
  /** Every participant's order, keyed by participant name (ours included). */
  orders: Record<string, Order>;
  closure: TableClosure | null;
  /** Peers we have heard of, so we can reach them again after a restart. */
  knownPeers: Record<string, string>;
}

/** The node's whole state, persisted as one JSON file (data/<table>-<name>.json). */
export class NodeStore {
  private writing: Promise<void> = Promise.resolve();

  private constructor(
    readonly path: string,
    readonly state: NodeState,
  ) {}

  static async open(path: string, initial: NodeState): Promise<NodeStore> {
    const saved = await readState(path);
    const state: NodeState = saved
      ? { ...saved, table: initial.table, me: initial.me }
      : initial;
    const store = new NodeStore(path, state);
    await store.save();
    return store;
  }

  /** Writes are serialized and atomic (write to a temp file, then rename). */
  save(): Promise<void> {
    const snapshot = JSON.stringify(this.state, null, 2);
    this.writing = this.writing.then(async () => {
      await mkdir(dirname(this.path), { recursive: true });
      const tmp = `${this.path}.tmp`;
      await writeFile(tmp, snapshot, "utf8");
      await rename(tmp, this.path);
    });
    return this.writing;
  }
}

async function readState(path: string): Promise<NodeState | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as NodeState;
  } catch {
    return null;
  }
}
