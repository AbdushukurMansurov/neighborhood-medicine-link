import { describe, expect, it } from "vitest";
import { formatSom, isFreeMedicine, patientPrice, pharmaciesWithStock, type Medicine, type Pharmacy } from "@/lib/pharmacy-data";
import { formatTimeLeft, isValidPrescriptionCode, nextDoctorVisit, timeLeft, urgencyOf } from "@/lib/prescription-timer";

const med = (o: Partial<Medicine>): Medicine => ({
  id: "m", brand_name: "Panadol", generic_name_xpn: "Paracetamol", dosage_form: null, strength: null,
  manufacturer: null, reimbursement_status: "full", reimbursement_percent: 100, price: 12000, created_at: "", ...o,
});
const ph = (name: string, partner: boolean): Pharmacy => ({
  id: name, name, address: "", city: "Tashkent", latitude: null, longitude: null, phone: null,
  is_dtsj_partner: partner, owner_id: null, created_at: "",
});

describe("DTSJ reimbursement", () => {
  it("a fully reimbursed medicine costs 0 SO'M", () => {
    expect(isFreeMedicine(med({}))).toBe(true);
    expect(formatSom(patientPrice(med({}))!)).toBe("0 SO'M");
  });
  it("a 50% reimbursed medicine costs half its price", () => {
    expect(patientPrice(med({ reimbursement_status: "partial", reimbursement_percent: 50, price: 68000 }))).toBe(34000);
  });
  it("free medicines are only offered at DTSJ partner pharmacies", () => {
    const list = pharmaciesWithStock(med({}), [ph("Oxy Med Pharmacy", true), ph("Green Cross", false)]);
    expect(list.map((p) => p.name)).toEqual(["Oxy Med Pharmacy"]);
  });
});

describe("7-day prescription timer", () => {
  const now = new Date("2026-11-12T10:00:00");
  it("shows days and hours left", () => {
    const t = timeLeft(new Date("2026-11-15T15:00:00"), now);
    expect(formatTimeLeft(t)).toBe("Retsept muddati tugashiga: 3 kun 5 soat qoldi");
  });
  it("warns at 2 days or less and is critical under 24 hours", () => {
    expect(urgencyOf(timeLeft(new Date("2026-11-14T10:00:00"), now))).toBe("soon");
    expect(urgencyOf(timeLeft(new Date("2026-11-13T09:00:00"), now))).toBe("critical");
    expect(urgencyOf(timeLeft(new Date("2026-11-11T09:00:00"), now))).toBe("expired");
  });
  it("prescription codes are exactly 12 digits", () => {
    expect(isValidPrescriptionCode("123456789012")).toBe(true);
    expect(isValidPrescriptionCode("12345678901")).toBe(false);
  });
});

describe("family doctor refill visit", () => {
  it("is one month after the start date", () => {
    expect(nextDoctorVisit(new Date("2026-11-01"), new Date("2026-11-12")).getDate()).toBe(1);
    expect(nextDoctorVisit(new Date("2026-11-01"), new Date("2026-11-12")).getMonth()).toBe(11);
  });
  it("rolls to the following month once a visit date has passed", () => {
    expect(nextDoctorVisit(new Date("2026-09-05"), new Date("2026-11-12")).getMonth()).toBe(11);
  });
});
