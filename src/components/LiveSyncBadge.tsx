import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncedLabel } from "@/lib/live-sync";
import type { LiveStatus } from "@/lib/use-live-stock";
import { cn } from "@/lib/utils";

const STATUS_TEXT: Record<LiveStatus, string> = {
  live: "Jonli holat",
  connecting: "Ulanmoqda…",
  offline: "Aloqa uzildi",
};

/** "Yangilash / Jonli holat" badge: realtime connection state plus the last stock sync time. */
export function LiveSyncBadge({ status, syncedAt, refreshing, onRefresh, className }: {
  status: LiveStatus; syncedAt: number | null; refreshing: boolean; onRefresh: () => void; className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [fresh, setFresh] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    setNow(Date.now());
    if (first.current) { first.current = false; return; }
    if (!syncedAt) return;
    setFresh(true);
    const t = window.setTimeout(() => setFresh(false), 2500);
    return () => window.clearTimeout(t);
  }, [syncedAt]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border-2 bg-card px-4 py-2 transition-colors duration-500",
        fresh && "border-success bg-secondary",
        className,
      )}
    >
      <span className="relative flex h-3.5 w-3.5" aria-hidden>
        {status === "live" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />}
        <span className={cn(
          "relative inline-flex h-3.5 w-3.5 rounded-full",
          status === "live" ? "bg-success" : status === "offline" ? "bg-destructive" : "bg-muted-foreground",
        )} />
      </span>
      <span className="text-lg font-bold">{STATUS_TEXT[status]}</span>
      <span className="text-base text-muted-foreground">{syncedLabel(syncedAt, now)}</span>
      <Button type="button" variant="outline" size="sm" className="h-10 text-base" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw className={cn(refreshing && "animate-spin")} /> Yangilash
      </Button>
    </div>
  );
}
