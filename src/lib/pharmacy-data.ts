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
 * Region, district, working hours and stock are not stored in the database yet,
 * so they live here as display data keyed by pharmacy / medicine name.
 */
const CITY_UZ: Record<string, { city: string; region: string }> = {
  Tashkent: { city: "Toshkent", region: "Toshkent shahri" },
  Samarkand: { city: "Samarqand", region: "Samarqand viloyati" },
  Bukhara: { city: "Buxoro", region: "Buxoro viloyati" },
};

const PHARMACY_EXTRAS: Record<string, { district: string; hours: string }> = {
  "Oxy Med Pharmacy": { district: "Yunusobod tumani", hours: "Har kuni 08:00 – 22:00" },
  "Dori-Darmon #7": { district: "Shayxontohur tumani", hours: "Kecha-kunduz (24/7)" },
  "Green Cross": { district: "Samarqand shahri", hours: "Du–Sha 09:00 – 20:00" },
  "Shifo Apteka": { district: "Buxoro shahri", hours: "Har kuni 08:00 – 21:00" },
};

const STOCK_BY_BRAND: Record<string, string[]> = {
  Panadol: ["Oxy Med Pharmacy", "Dori-Darmon #7", "Shifo Apteka", "Green Cross"],
  Glucophage: ["Oxy Med Pharmacy", "Shifo Apteka"],
  Concor: ["Dori-Darmon #7", "Shifo Apteka"],
  Augmentin: ["Oxy Med Pharmacy", "Green Cross"],
  Lipitor: ["Dori-Darmon #7", "Green Cross"],
  Nurofen: ["Oxy Med Pharmacy", "Dori-Darmon #7", "Green Cross", "Shifo Apteka"],
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

/** Pharmacies that currently stock a medicine. Free medicines are only handed out by DTSJ partners. */
export function pharmaciesWithStock<T extends Pharmacy>(m: Medicine, pharmacies: T[]): T[] {
  const names = STOCK_BY_BRAND[m.brand_name] ?? [];
  return pharmacies.filter(
    (p) => names.includes(p.name) && (!isFreeMedicine(m) || p.is_dtsj_partner),
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
