import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PackageCheck, QrCode, Search, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { isExpired } from "@/lib/auth";
import { conditionLabel } from "@/lib/conditions";
import { formatSom, isFreeMedicine, patientPrice, stockAt } from "@/lib/pharmacy-data";
import { formatPrescriptionCode, formatUzDate } from "@/lib/prescription-timer";
import { RxStatus } from "./DoctorPortal";

type FoundRx = {
  id: string; code: string; status: string; issued_at: string; expires_at: string; patient_id: string; medicine_id: string;
  diagnosis: string | null; quantity: number; dosage: string | null; dispensed_at: string | null;
  medicines: { brand_name: string; generic_name_xpn: string; strength: string | null; reimbursement_status: "full" | "partial" | "none"; reimbursement_percent: number; price: number | null } | null;
};

const RX_SELECT = "id, code, status, issued_at, expires_at, patient_id, medicine_id, diagnosis, quantity, dosage, dispensed_at, medicines(brand_name, generic_name_xpn, strength, reimbursement_status, reimbursement_percent, price)";
const fieldCls = "h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg font-medium text-foreground focus:border-primary focus:outline-none";

/** Dorixona paneli: look up a 12-digit e-prescription, verify the patient's 4-digit SMS code and dispense (stock -1). */
export function PharmacistPortal() {
  const qc = useQueryClient();
  const [pharmacyId, setPharmacyId] = useState("");
  const [code, setCode] = useState("");
  const [rx, setRx] = useState<FoundRx | null | undefined>(undefined);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ left: number } | null>(null);

  const { data: pharmacies = [] } = useQuery({
    queryKey: ["pharmacies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pharmacies").select("*").order("is_dtsj_partner", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: stock = [] } = useQuery({
    queryKey: ["stock"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pharmacy_stock").select("pharmacy_id, medicine_id, quantity");
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

  useEffect(() => {
    if (!pharmacyId && pharmacies[0]) setPharmacyId(pharmacies[0].id);
  }, [pharmacies, pharmacyId]);

  const pharmacy = pharmacies.find((p) => p.id === pharmacyId);
  const inventory = useMemo(
    () => medicines.map((m) => ({ m, qty: stockAt(stock, pharmacyId, m.id) })).filter((x) => stock.some((s) => s.pharmacy_id === pharmacyId && s.medicine_id === x.m.id)),
    [medicines, stock, pharmacyId],
  );

  async function load(clean: string) {
    setDone(null);
    setOtp("");
    const { data, error } = await supabase.from("prescriptions").select(RX_SELECT).eq("code", clean).maybeSingle();
    if (error) { toast.error(error.message); return; }
    setRx((data as FoundRx | null) ?? null);
    setPatientName(null);
    if (data) {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", data.patient_id).maybeSingle();
      setPatientName(prof?.full_name ?? null);
    }
  }

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.replace(/\D/g, "");
    if (clean.length !== 12) { toast.error("Retsept kodi 12 ta raqamdan iborat bo'lishi kerak"); return; }
    await load(clean);
  }

  async function scanMock() {
    const { data } = await supabase.from("prescriptions").select("code").eq("status", "active").gt("expires_at", new Date().toISOString())
      .order("issued_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) { toast.error("Skanerlash uchun faol retsept topilmadi"); return; }
    setCode(data.code);
    toast.success("QR kod o'qildi");
    await load(data.code);
  }

  async function dispense() {
    if (!rx || otp.length !== 4 || !pharmacyId) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("dispense_prescription", { _code: rx.code, _sms_code: otp, _pharmacy_id: pharmacyId });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const left = (data as { stock_left?: number } | null)?.stock_left ?? 0;
    setDone({ left });
    toast.success("Dori berildi. Zaxiradan 1 dona ayirildi.");
    qc.invalidateQueries({ queryKey: ["stock"] });
    qc.invalidateQueries({ queryKey: ["rx"] });
    await load(rx.code);
    setDone({ left });
  }

  const med = rx?.medicines;
  const price = med ? patientPrice(med) : null;
  const free = med ? isFreeMedicine(med) : false;
  const qtyHere = rx ? stockAt(stock, pharmacyId, rx.medicine_id) : 0;
  const canDispense = rx && rx.status === "active" && !isExpired(rx.expires_at);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b-2 pb-4">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-success text-success-foreground"><Store className="h-7 w-7" /></span>
        <div>
          <h2 className="text-3xl font-bold">Dorixona Paneli</h2>
          <p className="text-lg text-muted-foreground">E-retseptni tekshiring, SMS kodni tasdiqlang va dorini 0 so'mga bering.</p>
        </div>
      </div>

      <label className="block max-w-xl space-y-1.5">
        <span className="block text-lg font-semibold">Sizning dorixonangiz</span>
        <select className={fieldCls} value={pharmacyId} onChange={(e) => { setPharmacyId(e.target.value); setDone(null); }}>
          {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.address}{p.is_dtsj_partner ? " (DTSJ hamkori)" : ""}</option>)}
        </select>
      </label>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <form onSubmit={lookup} className="space-y-3 rounded-2xl border-2 bg-card p-5">
            <label htmlFor="ph-code" className="block text-xl font-bold">1. Bemorning 12 xonali e-retsept kodi</label>
            <input id="ph-code" inputMode="numeric" autoComplete="off" placeholder="0000 0000 0000"
              value={formatPrescriptionCode(code.replace(/\D/g, "").slice(0, 12))}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 12))}
              className="h-16 w-full rounded-2xl border-2 border-input bg-background px-5 text-center font-mono text-2xl font-bold tracking-[0.2em] text-foreground focus:border-primary focus:outline-none" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button size="xl" type="submit"><Search /> Tekshirish</Button>
              <Button size="xl" type="button" variant="bold" onClick={scanMock}><QrCode /> QR kodni skanerlash</Button>
            </div>
          </form>

          {rx === null && <p className="rounded-2xl border-2 border-dashed p-5 text-lg">Bu kod bo'yicha retsept topilmadi.</p>}

          {rx && med && (
            <div className="space-y-4 rounded-2xl border-2 bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-mono text-2xl font-bold tracking-widest">{formatPrescriptionCode(rx.code)}</p>
                <RxStatus status={rx.status} expiresAt={rx.expires_at} />
              </div>
              <dl className="grid gap-1 text-lg sm:grid-cols-[10rem_1fr]">
                <dt className="text-muted-foreground">Bemor:</dt><dd className="font-semibold">{patientName || "—"}</dd>
                <dt className="text-muted-foreground">Dori:</dt><dd className="font-semibold">{med.brand_name} {med.strength} · XPN: {med.generic_name_xpn}</dd>
                {rx.diagnosis && <><dt className="text-muted-foreground">Tashxis:</dt><dd>{conditionLabel(rx.diagnosis)}</dd></>}
                <dt className="text-muted-foreground">Miqdori:</dt><dd>{rx.quantity} qadoq{rx.dosage ? ` · ${rx.dosage}` : ""}</dd>
                <dt className="text-muted-foreground">Amal qiladi:</dt><dd>{formatUzDate(new Date(rx.expires_at), true)} gacha</dd>
                <dt className="text-muted-foreground">Zaxirada:</dt>
                <dd className={qtyHere > 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>{qtyHere > 0 ? `${qtyHere} dona` : "Tugagan"}</dd>
              </dl>

              {done && (
                <p className="flex items-center gap-2 rounded-xl bg-secondary p-4 text-lg font-bold text-secondary-foreground" role="status">
                  <CheckCircle2 className="h-6 w-6 text-success" /> Dori berildi. Zaxirada qoldi: {done.left} dona.
                </p>
              )}

              {canDispense && (
                <div className="space-y-3 border-t-2 pt-4">
                  <p className="text-xl font-bold">2. Bemor aytgan 4 xonali SMS kod</p>
                  <InputOTP maxLength={4} value={otp} onChange={setOtp} inputMode="numeric" pattern="^[0-9]*$" aria-label="SMS kod">
                    <InputOTPGroup>
                      {[0, 1, 2, 3].map((i) => <InputOTPSlot key={i} index={i} className="h-16 w-16 text-3xl font-bold" />)}
                    </InputOTPGroup>
                  </InputOTP>
                  <Button size="xl" variant="success" className="w-full" disabled={busy || otp.length !== 4 || qtyHere === 0} onClick={dispense}>
                    <PackageCheck /> {busy ? "Tekshirilmoqda…" : `Dorini Berish (${free ? "0 SO'M" : price != null ? formatSom(price) : "—"})`}
                  </Button>
                  {qtyHere === 0 && <p className="text-lg font-semibold text-destructive">Bu dorixonada ushbu dori qolmagan. Boshqa hamkor dorixonani tavsiya qiling.</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <section className="space-y-3 rounded-2xl border-2 bg-card p-5">
          <h3 className="text-2xl font-bold">Zaxira: {pharmacy?.name}</h3>
          {inventory.length === 0 ? <p className="text-lg text-muted-foreground">Zaxira ma'lumoti yo'q.</p> : (
            <ul className="divide-y">
              {inventory.map(({ m, qty }) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-lg">
                  <span><strong>{m.brand_name}</strong> <span className="text-muted-foreground">{m.strength}</span></span>
                  <span className={qty > 0 ? "font-bold" : "font-bold text-destructive"}>{qty > 0 ? `${qty} dona` : "Tugagan"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
