import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { AccountSummary } from "../api/types";

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const res = await api.get<{ accounts: AccountSummary[] }>("/accounts");
      setAccounts(res.accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { accounts, loading, error, reload };
}
