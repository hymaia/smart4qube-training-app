import type { Menu } from "../../shared/menu";
import type { OrderService } from "./orders/order-service";
import type { PeerSync } from "./protocol/peer-sync";
import type { NodeStore } from "./state/node-store";

/** Everything the HTTP routes need. Built once in node.ts. */
export interface NodeContext {
  store: NodeStore;
  menu: Menu;
  orders: OrderService;
  sync: PeerSync;
  clock: () => Date;
}
