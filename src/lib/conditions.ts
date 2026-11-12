import type { Medicine } from "@/lib/pharmacy-data";
import { isFreeMedicine } from "@/lib/pharmacy-data";

/** Chronic diagnoses covered by the state reimbursement programme. Keys match medicines.covered_conditions. */
export const CONDITIONS = [
  { key: "gipertoniya", label: "Gipertoniya", hint: "Yuqori qon bosimi" },
  { key: "diabet2", label: "Qandli diabet 2-tur", hint: "Qondagi qand miqdori yuqori" },
  { key: "astma", label: "Bronxial astma", hint: "Nafas yo'llari xuruji" },
  { key: "osok", label: "O'SOK", hint: "O'pkaning surunkali obstruktiv kasalligi" },
  { key: "yik", label: "Yurak ishemik kasalligi", hint: "Stenokardiya, infarktdan keyingi holat" },
] as const;

export type ConditionKey = (typeof CONDITIONS)[number]["key"];

export function conditionLabel(key: string) {
  return CONDITIONS.find((c) => c.key === key)?.label ?? key;
}

/** Free (0 so'm) medicines covered for at least one of the given diagnoses. */
export function coveredMedicines(medicines: Medicine[], conditions: string[]) {
  return medicines.filter(
    (m) => isFreeMedicine(m) && m.covered_conditions.some((c) => conditions.includes(c)),
  );
}

/** Covered medicines grouped by XPN (generic name), sorted alphabetically. */
export function groupByXpn(medicines: Medicine[]) {
  const map = new Map<string, Medicine[]>();
  for (const m of medicines) map.set(m.generic_name_xpn, [...(map.get(m.generic_name_xpn) ?? []), m]);
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}
