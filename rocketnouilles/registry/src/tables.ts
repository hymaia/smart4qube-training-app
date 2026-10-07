import type { TableInfo } from "./types";

/** The three tables of a training session. Keep in sync with the seed migration. */
export const SEEDED_TABLES: TableInfo[] = [
  { code: "RAMEN", name: "Ramen Rockets" },
  { code: "UDON", name: "Udon Orbiters" },
  { code: "SOBA", name: "Soba Satellites" },
];

/** A peer that has not sent a heartbeat for this long is no longer listed. */
export const PEER_TTL_MS = 2 * 60 * 1000;
