import { addMonths, startOfDay, startOfMonth, startOfWeek, addDays } from "date-fns";

export const PRESCRIPTION_VALID_DAYS = 7;

export type TimeLeft = { expired: boolean; days: number; hours: number; minutes: number; totalMs: number };

export function timeLeft(expiresAt: Date, now: Date): TimeLeft {
  const totalMs = expiresAt.getTime() - now.getTime();
  if (totalMs <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, totalMs: 0 };
  const totalMinutes = Math.floor(totalMs / 60000);
  return {
    expired: false,
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    totalMs,
  };
}

export function formatTimeLeft(t: TimeLeft) {
  if (t.expired) return "Retsept muddati tugagan";
  return `Retsept muddati tugashiga: ${t.days} kun ${t.hours} soat qoldi`;
}

export type Urgency = "ok" | "soon" | "critical" | "expired";

/** soon: 2 days or less, critical: under 24 hours. */
export function urgencyOf(t: TimeLeft): Urgency {
  if (t.expired) return "expired";
  const hours = t.totalMs / 3_600_000;
  if (hours < 24) return "critical";
  if (hours <= 48) return "soon";
  return "ok";
}

/** Next monthly family-doctor visit: the first monthly anniversary of `start` that is today or later. */
export function nextDoctorVisit(start: Date, now: Date): Date {
  const today = startOfDay(now);
  let visit = startOfDay(addMonths(start, 1));
  let i = 1;
  while (visit < today) {
    i += 1;
    visit = startOfDay(addMonths(start, i));
  }
  return visit;
}

/** 6 weeks of days starting on Monday, covering the given month. */
export function monthGrid(month: Date): Date[] {
  const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function dateKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export const UZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];
export const UZ_WEEKDAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
export const UZ_WEEKDAYS_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

export function formatUzDate(d: Date, withWeekday = false) {
  const base = `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`;
  return withWeekday ? `${base}, ${UZ_WEEKDAYS[d.getDay()]}` : base;
}

export function isValidPrescriptionCode(code: string) {
  return /^\d{12}$/.test(code);
}

export function formatPrescriptionCode(code: string) {
  return code.replace(/(\d{4})(?=\d)/g, "$1 ");
}
