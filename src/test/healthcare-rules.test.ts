import { describe, expect, it } from "vitest";
import { formatSom, freeAlternatives, isFreeMedicine, isShortage, patientPrice, pharmaciesWithStock, type Medicine, type Pharmacy, type StockRow } from "@/lib/pharmacy-data";
import { coveredMedicines } from "@/lib/conditions";
import { formatTimeLeft, isValidPrescriptionCode, nextDoctorVisit, timeLeft, urgencyOf } from "@/lib/prescription-timer";

const med = (o: Partial<Medicine>): Medicine => ({
  id: "m", brand_name: "Panadol", generic_name_xpn: "Paracetamol", dosage_form: null, strength: null,
  manufacturer: null, reimbursement_status: "full", reimbursement_percent: 100, price: 12000, covered_conditions: [], created_at: "", ...o,
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
    const stock: StockRow[] = [
      { pharmacy_id: "Oxy Med Pharmacy", medicine_id: "m", quantity: 5 },
      { pharmacy_id: "Green Cross", medicine_id: "m", quantity: 5 },
    ];
    const list = pharmaciesWithStock(med({}), [ph("Oxy Med Pharmacy", true), ph("Green Cross", false)], stock);
    expect(list.map((p) => p.name)).toEqual(["Oxy Med Pharmacy"]);
  });
  it("a pharmacy with 0 units does not count as having the medicine", () => {
    const stock: StockRow[] = [{ pharmacy_id: "Oxy Med Pharmacy", medicine_id: "m", quantity: 0 }];
    expect(pharmaciesWithStock(med({}), [ph("Oxy Med Pharmacy", true)], stock)).toEqual([]);
  });
});

describe("shortage alerts and generic substitutes", () => {
  const pharmacies = [ph("Oxy", true)];
  const glucophage = med({ id: "g", brand_name: "Glucophage", generic_name_xpn: "Metformin" });
  const siofor = med({ id: "s", brand_name: "Siofor", generic_name_xpn: "Metformin" });
  const diabeton = med({ id: "d", brand_name: "Diabeton MR", generic_name_xpn: "Gliclazide" });
  const stock: StockRow[] = [
    { pharmacy_id: "Oxy", medicine_id: "g", quantity: 0 },
    { pharmacy_id: "Oxy", medicine_id: "s", quantity: 4 },
    { pharmacy_id: "Oxy", medicine_id: "d", quantity: 4 },
  ];
  it("a reimbursed medicine with 0 stock is a shortage", () => {
    expect(isShortage(glucophage, pharmacies, stock)).toBe(true);
    expect(isShortage(siofor, pharmacies, stock)).toBe(false);
  });
  it("a non-reimbursed medicine never triggers the shortage alert", () => {
    expect(isShortage(med({ id: "n", reimbursement_status: "none", reimbursement_percent: 0 }), pharmacies, [])).toBe(false);
  });
  it("substitutes have the exact same XPN, are free and in stock", () => {
    expect(freeAlternatives(glucophage, [glucophage, siofor, diabeton], pharmacies, stock).map((m) => m.brand_name)).toEqual(["Siofor"]);
  });
});

describe("eligibility checker", () => {
  it("lists only free medicines covered for the chosen diagnosis", () => {
    const meds = [
      med({ id: "a", brand_name: "Siofor", covered_conditions: ["diabet2"] }),
      med({ id: "b", brand_name: "Enap", covered_conditions: ["gipertoniya"] }),
      med({ id: "c", brand_name: "Lipitor", covered_conditions: ["yik"], reimbursement_status: "partial", reimbursement_percent: 50 }),
    ];
    expect(coveredMedicines(meds, ["diabet2"]).map((m) => m.brand_name)).toEqual(["Siofor"]);
    expect(coveredMedicines(meds, ["yik"])).toEqual([]);
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
