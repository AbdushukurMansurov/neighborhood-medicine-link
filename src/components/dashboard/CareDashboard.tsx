import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, MapPin, Pill } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCareStore } from "@/lib/care-store";
import { enrichPharmacy, pharmaciesWithStock, type Medicine } from "@/lib/pharmacy-data";
import { MedicineChecker } from "./MedicineChecker";
import { PharmacyFinder, type MapHighlight } from "./PharmacyFinder";
import { PrescriptionCalendar, type PatientRx } from "./PrescriptionCalendar";

const SECTIONS = [
  { id: "dorixonalar", n: 1, title: "Dorixona qidiruvchisi", hint: "Xarita, hudud va yaqin dorixonalar", icon: MapPin },
  { id: "dorilar", n: 2, title: "Dori mavjudligini tekshirish", hint: "Bepul (0 so'm) dorilarni toping", icon: Pill },
  { id: "retsept", n: 3, title: "Aqlli retsept taqvimi", hint: "7 kunlik muddat va kundalik qabul", icon: CalendarClock },
] as const;

/** The three connected patient modules: pharmacy map, medicine availability and prescription calendar. */
export function CareDashboard({ userId }: { userId: string }) {
  const store = useCareStore(userId);
  const [highlight, setHighlight] = useState<MapHighlight | null>(null);
  const mapSectionRef = useRef<HTMLElement>(null);

  const { data: rawPharmacies = [] } = useQuery({
    queryKey: ["pharmacies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pharmacies").select("*").order("is_dtsj_partner", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: medicines = [], isLoading: medsLoading } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medicines").select("*").order("brand_name");
      if (error) throw error;
      return data;
    },
  });
  const { data: prescriptions = [] } = useQuery({
    queryKey: ["rx", "patient", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, code, status, issued_at, expires_at, medicine_id, medicines(brand_name, generic_name_xpn)")
        .eq("patient_id", userId)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data as PatientRx[];
    },
  });

  const pharmacies = useMemo(() => rawPharmacies.map(enrichPharmacy), [rawPharmacies]);

  function showFreePharmacies(m: Medicine) {
    const ids = pharmaciesWithStock(m, pharmacies).map((p) => p.id);
    if (ids.length === 0) {
      toast.error("Bu dori hozircha hamkor dorixonalarda yo'q");
      return;
    }
    setHighlight({ medicine: m, pharmacyIds: ids });
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addToCalendar(m: Medicine) {
    store.addMedicine(m);
    toast.success(`«${m.brand_name}» taqvimga qo'shildi`);
  }

  return (
    <div className="space-y-14">
      <nav aria-label="Bo'limlar" className="grid gap-3 sm:grid-cols-3">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`}
            className="group flex items-center gap-4 rounded-2xl border-2 bg-card p-5 transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><s.icon className="h-7 w-7" /></span>
            <span>
              <span className="block text-xl font-bold leading-tight">{s.title}</span>
              <span className="block text-base text-muted-foreground">{s.hint}</span>
            </span>
          </a>
        ))}
      </nav>

      <section id="dorixonalar" ref={mapSectionRef} className="scroll-mt-20 space-y-5">
        <SectionTitle n={1} title="Dorixona qidiruvchisi" text="Hududni tanlang yoki yaqiningizdagi dorixonalarni toping." />
        <PharmacyFinder
          pharmacies={pharmacies}
          highlight={highlight}
          onClearHighlight={() => setHighlight(null)}
          onAddToCalendar={addToCalendar}
          isTracked={store.isTracked}
        />
      </section>

      <section id="dorilar" className="scroll-mt-20 space-y-5">
        <SectionTitle n={2} title="Dori mavjudligini tekshirish" text="Savdo nomi yoki xalqaro patentlanmagan nomi (XPN) bo'yicha qidiring." />
        <MedicineChecker
          medicines={medicines}
          pharmacies={pharmacies}
          loading={medsLoading}
          onGetFree={showFreePharmacies}
          onAddToCalendar={addToCalendar}
          isTracked={store.isTracked}
        />
      </section>

      <section id="retsept" className="scroll-mt-20 space-y-5">
        <SectionTitle n={3} title="Aqlli retsept taqvimi" text="Retsept muddatini kuzating, dorini ichganingizni belgilang." />
        <PrescriptionCalendar prescriptions={prescriptions} medicines={medicines} store={store} onShowFreePharmacies={showFreePharmacies} />
      </section>
    </div>
  );
}

function SectionTitle({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="flex items-start gap-4 border-b-2 pb-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-foreground font-display text-2xl font-bold text-background">{n}</span>
      <div>
        <h2 className="text-3xl font-bold">{title}</h2>
        <p className="text-lg text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
