import type { StockRow } from "./pharmacy-data";

export type StockChangeEvent = "INSERT" | "UPDATE" | "DELETE";

/** Applies one realtime change of the pharmacy_stock table to the cached stock list, keeping row order. */
export function applyStockChange(stock: StockRow[], event: StockChangeEvent, row: Partial<StockRow> | null | undefined): StockRow[] {
  if (!row?.pharmacy_id || !row.medicine_id) return stock;
  const same = (s: StockRow) => s.pharmacy_id === row.pharmacy_id && s.medicine_id === row.medicine_id;
  if (event === "DELETE") return stock.filter((s) => !same(s));
  const next: StockRow = { pharmacy_id: row.pharmacy_id, medicine_id: row.medicine_id, quantity: Number(row.quantity ?? 0) };
  return stock.some(same) ? stock.map((s) => (same(s) ? next : s)) : [...stock, next];
}

/** "Hozirgina yangilandi" / "3 daqiqa oldin yangilandi" / "Soat 14:05 da yangilandi". */
export function syncedLabel(syncedAt: number | null, now: number) {
  if (!syncedAt) return "Hali yangilanmagan";
  const sec = Math.max(0, Math.round((now - syncedAt) / 1000));
  if (sec < 60) return "Hozirgina yangilandi";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} daqiqa oldin yangilandi`;
  const d = new Date(syncedAt);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `Soat ${hh}:${mm} da yangilandi`;
}
