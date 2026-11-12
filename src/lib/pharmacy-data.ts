import type { Database } from "@/integrations/supabase/types";

export type Pharmacy = Database["public"]["Tables"]["pharmacies"]["Row"];
export type Medicine = Database["public"]["Tables"]["medicines"]["Row"];

export type EnrichedPharmacy = Pharmacy & {
  region: string;
  district: string;
  hours: string;
  cityUz: string;
};

/*
 * Region, district and working hours are not stored in the database yet,
 * so they live here as display data keyed by pharmacy name. Stock comes from
 * the pharmacy_stock table.
 */
const CITY_UZ: Record<string, { city: string; region: string }> = {
  Tashkent: { city: "Toshkent", region: "Toshkent shahri" },
  Samarkand: { city: "Samarqand", region: "Samarqand viloyati" },
  Bukhara: { city: "Buxoro", region: "Buxoro viloyati" },
  Andijan: { city: "Andijon", region: "Andijon viloyati" },
  Namangan: { city: "Namangan", region: "Namangan viloyati" },
  Fergana: { city: "Farg'ona", region: "Farg'ona viloyati" },
};

const PHARMACY_EXTRAS: Record<string, { district: string; hours: string }> = {
  "Oxy Med Pharmacy": { district: "Yunusobod tumani", hours: "Har kuni 08:00 – 22:00" },
  "Dori-Darmon #7": { district: "Shayxontohur tumani", hours: "Kecha-kunduz (24/7)" },
  "Green Cross": { district: "Samarqand shahri", hours: "Du–Sha 09:00 – 20:00" },
  "Shifo Apteka": { district: "Buxoro shahri", hours: "Har kuni 08:00 – 21:00" },
  "Arzon Apteka": { district: "Chilonzor tumani", hours: "Har kuni 08:00 – 23:00" },
  "Ibn Sino Dorixonasi": { district: "Yunusobod tumani", hours: "Har kuni 08:00 – 22:00" },
  "Sihat Plus": { district: "Yunusobod tumani", hours: "Kecha-kunduz (24/7)" },
  "Navro'z Farm": { district: "Chilonzor tumani", hours: "Har kuni 08:00 – 21:00" },
  "Mehr Dorixonasi": { district: "Chilonzor tumani", hours: "Du–Sha 09:00 – 20:00" },
  "Ulug'bek Farm": { district: "Mirzo Ulug'bek tumani", hours: "Har kuni 08:00 – 23:00" },
  "Buyuk Ipak Dorixonasi": { district: "Mirzo Ulug'bek tumani", hours: "Har kuni 07:30 – 22:00" },
  "Sergeli Sog'lom Hayot": { district: "Sergeli tumani", hours: "Har kuni 08:00 – 21:00" },
  "Eski Shahar Dorixonasi": { district: "Shayxontohur tumani", hours: "Kecha-kunduz (24/7)" },
  "Olmazor Med": { district: "Olmazor tumani", hours: "Du–Sha 08:30 – 20:30" },
  "Afrosiyob Farm": { district: "Samarqand shahri", hours: "Har kuni 08:00 – 22:00" },
  "Registon Dorixonasi": { district: "Samarqand shahri", hours: "Har kuni 08:00 – 21:00" },
  "Naqshband Farm": { district: "Buxoro shahri", hours: "Har kuni 08:00 – 21:00" },
  "Bobur Dorixonasi": { district: "Andijon shahri", hours: "Har kuni 08:00 – 22:00" },
  "Namangan Gul Farm": { district: "Namangan shahri", hours: "Har kuni 08:00 – 21:00" },
  "Farg'ona Sihat": { district: "Farg'ona shahri", hours: "Du–Sha 08:00 – 21:00" },
};

export function enrichPharmacy(p: Pharmacy): EnrichedPharmacy {
  const city = CITY_UZ[p.city] ?? { city: p.city, region: p.city };
  const extra = PHARMACY_EXTRAS[p.name] ?? { district: `${city.city} shahri`, hours: "Har kuni 09:00 – 20:00" };
  return { ...p, region: city.region, cityUz: city.city, district: extra.district, hours: extra.hours };
}

/** Free = fully covered by the State Health Insurance Fund (DTSJ). */
export function isFreeMedicine(m: Pick<Medicine, "reimbursement_status" | "reimbursement_percent">) {
  return m.reimbursement_status === "full" && m.reimbursement_percent >= 100;
}

/** What the patient pays after DTSJ reimbursement, in so'm. */
export function patientPrice(m: Pick<Medicine, "reimbursement_status" | "reimbursement_percent" | "price">) {
  if (isFreeMedicine(m)) return 0;
  if (m.price == null) return null;
  const covered = m.reimbursement_status === "none" ? 0 : m.reimbursement_percent;
  return Math.round((Number(m.price) * (100 - covered)) / 100);
}

export function formatSom(value: number) {
  if (value === 0) return "0 SO'M";
  return `${value.toLocaleString("ru-RU").replace(/,/g, " ")} so'm`;
}

export type StockRow = { pharmacy_id: string; medicine_id: string; quantity: number };

/** Units of a medicine in one pharmacy (0 when there is no stock row). */
export function stockAt(stock: StockRow[], pharmacyId: string, medicineId: string) {
  return stock.find((s) => s.pharmacy_id === pharmacyId && s.medicine_id === medicineId)?.quantity ?? 0;
}

/** Pharmacies that currently stock a medicine. Free medicines are only handed out by DTSJ partners. */
export function pharmaciesWithStock<T extends Pharmacy>(m: Medicine, pharmacies: T[], stock: StockRow[]): T[] {
  return pharmacies.filter(
    (p) => stockAt(stock, p.id, m.id) > 0 && (!isFreeMedicine(m) || p.is_dtsj_partner),
  );
}

/** A reimbursed medicine that no (partner) pharmacy currently has. */
export function isShortage(m: Medicine, pharmacies: Pharmacy[], stock: StockRow[]) {
  return m.reimbursement_status !== "none" && pharmaciesWithStock(m, pharmacies, stock).length === 0;
}

/** Free substitutes with the same XPN (generic name) that partner pharmacies have right now. */
export function freeAlternatives(m: Medicine, medicines: Medicine[], pharmacies: Pharmacy[], stock: StockRow[]) {
  const xpn = m.generic_name_xpn.trim().toLowerCase();
  return medicines.filter(
    (alt) =>
      alt.id !== m.id &&
      alt.generic_name_xpn.trim().toLowerCase() === xpn &&
      isFreeMedicine(alt) &&
      pharmaciesWithStock(alt, pharmacies, stock).length > 0,
  );
}

export function matchesMedicine(m: Medicine, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return m.brand_name.toLowerCase().includes(q) || m.generic_name_xpn.toLowerCase().includes(q);
}

export type LatLng = { lat: number; lng: number };

export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Map centre used when the browser cannot share the user's location (Tashkent). */
export const DEFAULT_LOCATION: LatLng = { lat: 41.3111, lng: 69.2797 };
