import { useCallback, useEffect, useState } from "react";
import type { TableView } from "../../shared/types";
import { api } from "./api";

const POLL_MS = 2000;

/** Polls the node for the table state; `refresh` forces an immediate reload. */
export function useTableView() {
  const [view, setView] = useState<TableView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setView(await api.state());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { view, error, refresh };
}
