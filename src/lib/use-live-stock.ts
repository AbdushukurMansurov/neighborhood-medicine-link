import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyStockChange, type StockChangeEvent } from "./live-sync";
import type { StockRow } from "./pharmacy-data";

export const STOCK_QUERY_KEY = ["stock"] as const;
export type LiveStatus = "connecting" | "live" | "offline";

/**
 * Pharmacy stock that stays current: loads pharmacy_stock once, then applies
 * realtime changes (e.g. a pharmacist dispensing) straight into the query cache.
 */
export function useLiveStock() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: STOCK_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("pharmacy_stock").select("pharmacy_id, medicine_id, quantity");
      if (error) throw error;
      return data as StockRow[];
    },
  });
  const [status, setStatus] = useState<LiveStatus>("connecting");

  useEffect(() => {
    let wasLive = false;
    const channel = supabase
      .channel(`pharmacy-stock-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pharmacy_stock" }, (payload) => {
        const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Partial<StockRow>;
        qc.setQueryData<StockRow[]>(STOCK_QUERY_KEY, (prev) => applyStockChange(prev ?? [], payload.eventType as StockChangeEvent, row));
      })
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          // After a reconnect, reload once so changes missed while offline are not lost.
          if (wasLive) qc.invalidateQueries({ queryKey: STOCK_QUERY_KEY });
          wasLive = true;
          setStatus("live");
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setStatus("offline");
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return {
    stock: query.data ?? [],
    status,
    syncedAt: query.dataUpdatedAt || null,
    refreshing: query.isFetching,
    refresh: () => query.refetch(),
  };
}
