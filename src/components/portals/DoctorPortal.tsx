import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { FilePlus2, MessageSquareText, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isExpired } from "@/lib/auth";
import { CONDITIONS, conditionLabel, coveredMedicines, groupByXpn } from "@/lib/conditions";
import { PRESCRIPTION_VALID_DAYS, formatPrescriptionCode, formatUzDate } from "@/lib/prescription-timer";
import { cn } from "@/lib/utils";

type IssuedRx = {
  id: string; code: string; status: string; issued_at: string; expires_at: string; patient_id: string;
  diagnosis: string | null; quantity: number; dosage: string | null;
  medicines: { brand_name: string; generic_name_xpn: string; strength: string | null } | null;
};

type SmsPreview = { patientName: string; medicine: string; code: string; sms: string; expiresAt: Date };

const fieldCls = "h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg font-medium text-foreground focus:border-primary focus:outline-none";

/** Shifokor paneli: choose a patient, a covered diagnosis and an XPN medicine, then issue a 12-digit e-prescription. */
export function DoctorPortal({ uid }: { uid: string }) {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState("");
  const [condition, setCondition] = useState<string>(CONDITIONS[0].key);
  const [medicineId, setMedicineId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [dosage, setDosage] = useState("Kuniga 1 marta, ovqatdan keyin");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<SmsPreview | null>(null);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name").neq("id", uid).order("full_name");
      if (error) throw error;
      return data;
    },
  });
  const { data: medicines = [] } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medicines").select("*").order("brand_name");
      if (error) throw error;
      return data;
    },
  });
  const { data: issued = [] } = useQuery({
    queryKey: ["rx", "doctor", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, code, status, issued_at, expires_at, patient_id, diagnosis, quantity, dosage, medicines(brand_name, generic_name_xpn, strength)")
        .eq("doctor_id", uid)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data as IssuedRx[];
    },
  });

  const groups = useMemo(() => groupByXpn(coveredMedicines(medicines, [condition])), [medicines, condition]);
  const selectedPatient = patients.find((p) => p.id === (patientId || patients[0]?.id));
  const effectiveMedicineId = medicineId && groups.some(([, ms]) => ms.some((m) => m.id === medicineId)) ? medicineId : groups[0]?.[1][0]?.id ?? "";
  const selectedMedicine = medicines.find((m) => m.id === effectiveMedicineId);
  const nameOf = (id: string) => patients.find((p) => p.id === id)?.full_name || "Bemor";

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) { toast.error("Avval bemorni tanlang"); return; }
    if (!selectedMedicine) { toast.error("Ushbu tashxis uchun dori tanlang"); return; }
    setBusy(true);
    const { data: rx, error } = await supabase
      .from("prescriptions")
      .insert({
        doctor_id: uid,
        patient_id: selectedPatient.id,
        medicine_id: selectedMedicine.id,
        diagnosis: condition,
        quantity,
        dosage: dosage.trim() || null,
        code: "",
        expires_at: new Date().toISOString(),
      })
      .select("id, code, expires_at")
      .single();
    if (error) { setBusy(false); toast.error("Retsept yozilmadi: " + error.message); return; }
    const { data: sms } = await supabase.from("prescription_sms").select("sms_code").eq("prescription_id", rx.id).maybeSingle();
    setBusy(false);
    setPreview({
      patientName: selectedPatient.full_name || "Bemor",
      medicine: `${selectedMedicine.brand_name} ${selectedMedicine.strength ?? ""}`.trim(),
      code: rx.code,
      sms: sms?.sms_code ?? "----",
      expiresAt: new Date(rx.expires_at),
    });
    toast.success(`${formatPrescriptionCode(rx.code)} raqamli e-retsept yozildi`);
    qc.invalidateQueries({ queryKey: ["rx"] });
  }

  const expiryPreview = addDays(new Date(), PRESCRIPTION_VALID_DAYS);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b-2 pb-4">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-primary text-primary-foreground"><Stethoscope className="h-7 w-7" /></span>
        <div>
          <h2 className="text-3xl font-bold">Shifokor Paneli</h2>
          <p className="text-lg text-muted-foreground">Surunkali kasallik uchun davlat hisobidan bepul e-retsept yozing.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <form onSubmit={issue} className="space-y-5 rounded-2xl border-2 bg-card p-5 sm:p-6">
          <label className="block space-y-1.5">
            <span className="block text-lg font-semibold">1. Bemorni tanlang</span>
            <select className={fieldCls} value={selectedPatient?.id ?? ""} onChange={(e) => setPatientId(e.target.value)}>
              {patients.length === 0 && <option value="">Bemorlar topilmadi</option>}
              {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name || "Ismsiz bemor"}</option>)}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="text-lg font-semibold">2. Tashxis (surunkali kasallik)</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CONDITIONS.map((c) => (
                <button key={c.key} type="button" onClick={() => { setCondition(c.key); setMedicineId(""); }} aria-pressed={condition === c.key}
                  className={cn("rounded-xl border-2 p-3 text-left text-lg font-semibold transition-colors", condition === c.key ? "border-primary bg-secondary" : "hover:bg-muted")}>
                  {c.label}
                  <span className="block text-sm font-normal text-muted-foreground">{c.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-1.5">
            <span className="block text-lg font-semibold">3. XPN bo'yicha dori</span>
            <select className={fieldCls} value={effectiveMedicineId} onChange={(e) => setMedicineId(e.target.value)}>
              {groups.map(([xpn, ms]) => (
                <optgroup key={xpn} label={`XPN: ${xpn}`}>
                  {ms.map((m) => <option key={m.id} value={m.id}>{m.brand_name} {m.strength} — 0 SO'M</option>)}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <label className="block space-y-1.5">
              <span className="block text-lg font-semibold">Soni</span>
              <input type="number" min={1} max={10} className={fieldCls} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label className="block space-y-1.5">
              <span className="block text-lg font-semibold">Qabul tartibi</span>
              <input className={fieldCls} value={dosage} onChange={(e) => setDosage(e.target.value)} />
            </label>
          </div>

          <p className="rounded-xl bg-muted p-3 text-lg">
            12 xonali kod avtomatik yaratiladi. Amal qilish muddati: <strong>{formatUzDate(expiryPreview, true)}</strong> gacha ({PRESCRIPTION_VALID_DAYS} kun).
          </p>
          <Button size="xl" className="w-full" disabled={busy || !selectedPatient}><FilePlus2 /> {busy ? "Yozilmoqda…" : "E-retsept yozish"}</Button>
        </form>

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-2xl font-bold"><MessageSquareText className="h-6 w-6" /> SMS xabarnoma namunasi</h3>
          {preview ? (
            <div className="rounded-3xl border-4 border-foreground bg-muted p-4">
              <p className="mb-2 text-center text-sm font-semibold text-muted-foreground">Bemor telefoniga yuborildi · {preview.patientName}</p>
              <div className="rounded-2xl rounded-tl-sm bg-card p-4 text-lg leading-relaxed shadow-sm">
                <p className="font-bold">SHIFO-DTSJ</p>
                <p>Hurmatli {preview.patientName}! Sizga «{preview.medicine}» uchun bepul e-retsept yozildi.</p>
                <p className="mt-2">Retsept: <strong className="font-mono">{formatPrescriptionCode(preview.code)}</strong></p>
                <p>SMS kod: <strong className="font-mono text-xl">{preview.sms}</strong></p>
                <p className="mt-2">{formatUzDate(preview.expiresAt)} gacha DTSJ hamkor dorixonasidan 0 so'mga oling. Kodni faqat farmatsevtga ayting.</p>
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border-2 border-dashed p-6 text-lg text-muted-foreground">Retsept yozganingizdan so'ng bemorga yuboriladigan SMS shu yerda ko'rinadi.</p>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="text-2xl font-bold">Yozilgan retseptlar</h3>
        {issued.length === 0 ? <p className="text-lg text-muted-foreground">Hozircha yo'q.</p> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {issued.map((rx) => (
              <li key={rx.id} className="rounded-2xl border-2 bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-xl font-bold tracking-widest">{formatPrescriptionCode(rx.code)}</p>
                  <RxStatus status={rx.status} expiresAt={rx.expires_at} />
                </div>
                <p className="mt-1 text-lg font-semibold">{rx.medicines?.brand_name} {rx.medicines?.strength} <span className="font-normal text-muted-foreground">· {rx.medicines?.generic_name_xpn}</span></p>
                <p className="text-base text-muted-foreground">
                  {nameOf(rx.patient_id)}{rx.diagnosis ? ` · ${conditionLabel(rx.diagnosis)}` : ""} · {formatUzDate(new Date(rx.expires_at))} gacha
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function RxStatus({ status, expiresAt }: { status: string; expiresAt: string }) {
  if (status === "dispensed") return <Badge variant="secondary" className="text-sm">Berilgan</Badge>;
  if (status === "cancelled") return <Badge variant="outline" className="text-sm">Bekor qilingan</Badge>;
  if (isExpired(expiresAt)) return <Badge variant="destructive" className="text-sm">Muddati tugagan</Badge>;
  return <Badge variant="success" className="text-sm">Faol</Badge>;
}
