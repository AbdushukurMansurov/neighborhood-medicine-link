import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, isSameDay, isSameMonth, startOfDay, subMonths } from "date-fns";
import { AlarmClock, Check, ChevronLeft, ChevronRight, MapPinned, QrCode, ScanLine, Stethoscope, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { CareStore } from "@/lib/care-store";
import { isFreeMedicine, type Medicine } from "@/lib/pharmacy-data";
import {
  PRESCRIPTION_VALID_DAYS, UZ_MONTHS, UZ_WEEKDAYS_SHORT, dateKey, formatPrescriptionCode, formatTimeLeft,
  formatUzDate, isValidPrescriptionCode, monthGrid, nextDoctorVisit, timeLeft, urgencyOf,
} from "@/lib/prescription-timer";
import { cn } from "@/lib/utils";

export type PatientRx = {
  id: string;
  code: string;
  status: string;
  issued_at: string;
  expires_at: string;
  medicine_id: string;
  medicines: { brand_name: string; generic_name_xpn: string } | null;
};

type ActiveRx = {
  code: string;
  issuedAt: Date;
  expiresAt: Date;
  medicine: Medicine | null;
  medicineName: string;
  demo: boolean;
};

type Props = {
  prescriptions: PatientRx[];
  medicines: Medicine[];
  store: CareStore;
  onShowFreePharmacies: (m: Medicine) => void;
};

export function PrescriptionCalendar({ prescriptions, medicines, store, onShowFreePharmacies }: Props) {
  const [code, setCode] = useState("");
  const [active, setActive] = useState<ActiveRx | null>(null);
  const [scanning, setScanning] = useState(false);
  const [checking, setChecking] = useState(false);

  const medById = (id: string) => medicines.find((m) => m.id === id) ?? null;

  // Restore the demo prescription after a reload.
  useEffect(() => {
    if (active || !store.demoRx || medicines.length === 0) return;
    setActive(fromDemo(store.demoRx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.demoRx, medicines.length]);

  function fromDemo(d: NonNullable<CareStore["demoRx"]>): ActiveRx {
    const issuedAt = new Date(d.issuedAt);
    const m = medById(d.medicineId);
    return { code: d.code, issuedAt, expiresAt: addDays(issuedAt, PRESCRIPTION_VALID_DAYS), medicine: m, medicineName: m?.brand_name ?? "Dori", demo: true };
  }

  function activate(rx: PatientRx) {
    const m = medById(rx.medicine_id);
    setActive({
      code: rx.code, issuedAt: new Date(rx.issued_at), expiresAt: new Date(rx.expires_at),
      medicine: m, medicineName: rx.medicines?.brand_name ?? m?.brand_name ?? "Dori", demo: false,
    });
    if (m) store.addMedicine(m, rx.issued_at);
    setCode(rx.code);
  }

  async function lookup(raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!isValidPrescriptionCode(clean)) {
      toast.error("Retsept kodi 12 ta raqamdan iborat bo'lishi kerak");
      return;
    }
    const own = prescriptions.find((p) => p.code === clean);
    if (own) return activate(own);
    if (store.demoRx?.code === clean) return setActive(fromDemo(store.demoRx));
    setChecking(true);
    const { data } = await supabase
      .from("prescriptions")
      .select("id, code, status, issued_at, expires_at, medicine_id, medicines(brand_name, generic_name_xpn)")
      .eq("code", clean)
      .maybeSingle();
    setChecking(false);
    if (data) return activate(data as PatientRx);
    toast.error("Bu kod bo'yicha retsept topilmadi. Kodni tekshirib, qayta kiriting.");
  }

  function finishScan() {
    setScanning(false);
    const real = prescriptions.find((p) => p.status === "active" && new Date(p.expires_at) > new Date());
    if (real) {
      toast.success("QR kod o'qildi");
      return activate(real);
    }
    const m = medicines.find((x) => x.brand_name === "Glucophage") ?? medicines.find(isFreeMedicine) ?? medicines[0];
    if (!m) return;
    const demo = { code: String(Math.floor(1e11 + Math.random() * 9e11)), issuedAt: new Date().toISOString(), medicineId: m.id };
    store.setDemoRx(demo);
    store.addMedicine(m, demo.issuedAt);
    setActive(fromDemo(demo));
    setCode(demo.code);
    toast.success("QR kod o'qildi (namuna retsept)");
  }

  const activeList = prescriptions.filter((p) => p.status === "active");

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4 rounded-2xl border-2 bg-card p-5">
          <form onSubmit={(e) => { e.preventDefault(); void lookup(code); }} className="space-y-3">
            <label htmlFor="rx-code" className="block text-xl font-bold">Elektron retsept kodi (12 raqam)</label>
            <input
              id="rx-code"
              inputMode="numeric"
              autoComplete="off"
              value={formatPrescriptionCode(code.replace(/\D/g, "").slice(0, 12))}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="0000 0000 0000"
              className="h-16 w-full rounded-2xl border-2 border-input bg-background px-5 text-center font-mono text-2xl font-bold tracking-[0.2em] text-foreground focus:border-primary focus:outline-none"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button size="xl" type="submit" disabled={checking}>{checking ? "Tekshirilmoqda…" : "Tekshirish"}</Button>
              <Button size="xl" type="button" variant="bold" onClick={() => setScanning(true)}><QrCode /> QR kodni skanerlash</Button>
            </div>
          </form>
          {activeList.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-lg font-semibold">Mening faol retseptlarim:</p>
              {activeList.map((rx) => (
                <button key={rx.id} type="button" onClick={() => activate(rx)}
                  className="flex w-full items-center justify-between rounded-xl border-2 p-3 text-left text-lg hover:border-primary">
                  <span className="font-semibold">{rx.medicines?.brand_name}</span>
                  <span className="font-mono">{formatPrescriptionCode(rx.code)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Countdown active={active} onShowFreePharmacies={onShowFreePharmacies} />
      </div>

      <MonthCalendar store={store} activeIssuedAt={active?.issuedAt ?? null} />

      <Dialog open={scanning} onOpenChange={setScanning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">QR kodni skanerlash</DialogTitle>
            <DialogDescription className="text-lg">Retseptdagi QR kodni ramka ichiga joylashtiring.</DialogDescription>
          </DialogHeader>
          <ScannerMock onDone={finishScan} active={scanning} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScannerMock({ active, onDone }: { active: boolean; onDone: () => void }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => doneRef.current(), 2200);
    return () => clearTimeout(t);
  }, [active]);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-foreground">
      <div className="absolute inset-8 rounded-xl border-4 border-dashed border-accent" />
      <QrCode className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 text-background opacity-70" />
      <div className="animate-scan-line absolute inset-x-6 h-1 rounded-full bg-accent" />
      <p className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 text-lg font-semibold text-background">
        <ScanLine className="h-5 w-5" /> O'qilmoqda…
      </p>
    </div>
  );
}

function Countdown({ active, onShowFreePharmacies }: { active: ActiveRx | null; onShowFreePharmacies: (m: Medicine) => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [active]);

  if (!active) {
    return (
      <div className="grid place-items-center rounded-2xl border-2 border-dashed p-8 text-center">
        <div>
          <AlarmClock className="mx-auto h-14 w-14 text-muted-foreground" />
          <p className="mt-3 text-xl font-semibold">Retsept kodini kiriting yoki QR kodni skanerlang</p>
          <p className="mt-1 text-lg text-muted-foreground">Davlat retsepti {PRESCRIPTION_VALID_DAYS} kun amal qiladi — biz qolgan vaqtni ko'rsatamiz.</p>
        </div>
      </div>
    );
  }

  const left = timeLeft(active.expiresAt, now);
  const level = urgencyOf(left);
  const totalMs = PRESCRIPTION_VALID_DAYS * 86_400_000;
  const pct = Math.max(0, Math.min(100, (left.totalMs / totalMs) * 100));

  return (
    <div
      role="timer"
      aria-live="polite"
      className={cn(
        "rounded-2xl border-4 p-6",
        level === "ok" && "border-success bg-secondary",
        level === "soon" && "border-warning bg-highlight",
        (level === "critical" || level === "expired") && "border-destructive bg-card",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xl font-bold">{active.medicineName}</p>
        <div className="flex gap-2">
          {active.demo && <Badge variant="outline" className="text-sm">Namuna retsept</Badge>}
          <Badge variant="outline" className="font-mono text-sm">{formatPrescriptionCode(active.code)}</Badge>
        </div>
      </div>
      <p className="mt-4 text-lg font-semibold">{left.expired ? "Diqqat!" : "Retsept muddati tugashiga:"}</p>
      {left.expired ? (
        <p className="text-4xl font-extrabold text-destructive">Muddat tugagan</p>
      ) : (
        <p className="font-display text-5xl font-extrabold leading-tight sm:text-6xl">
          {left.days} <span className="text-3xl">kun</span> {left.hours} <span className="text-3xl">soat</span>
          <span className="block text-2xl font-bold">qoldi</span>
        </p>
      )}
      <span className="sr-only">{formatTimeLeft(left)}</span>
      <div className="mt-4 h-4 overflow-hidden rounded-full bg-background" aria-hidden>
        <div className={cn("h-full rounded-full", level === "ok" ? "bg-success" : level === "soon" ? "bg-warning" : "bg-destructive")} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-lg">Amal qilish muddati: <strong>{formatUzDate(active.expiresAt, true)}</strong>, soat {String(active.expiresAt.getHours()).padStart(2, "0")}:{String(active.expiresAt.getMinutes()).padStart(2, "0")} gacha</p>
      {(level === "soon" || level === "critical") && (
        <p className="mt-3 rounded-xl bg-destructive p-3 text-lg font-bold text-destructive-foreground">
          Muddat tugashiga oz qoldi! Dorini bugun oling.
        </p>
      )}
      {level === "expired" && (
        <p className="mt-3 text-lg font-semibold">Yangi retsept uchun oilaviy shifokoringizga murojaat qiling.</p>
      )}
      {active.medicine && isFreeMedicine(active.medicine) && !left.expired && (
        <Button size="xl" variant="success" className="mt-4 w-full" onClick={() => onShowFreePharmacies(active.medicine!)}>
          <MapPinned /> Yaqin dorixonadan bepul olish
        </Button>
      )}
    </div>
  );
}

function MonthCalendar({ store, activeIssuedAt }: { store: CareStore; activeIssuedAt: Date | null }) {
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(today);
  const [selected, setSelected] = useState(today);

  const start = useMemo(() => {
    const dates = store.meds.map((m) => new Date(m.addedAt));
    if (activeIssuedAt) dates.push(activeIssuedAt);
    return dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
  }, [store.meds, activeIssuedAt]);
  const visit = start ? nextDoctorVisit(start, today) : null;
  const days = monthGrid(month);
  const selectedKey = dateKey(selected);
  const takenSelected = store.intake[selectedKey] ?? [];
  const canLog = selected <= today;
  const daysToVisit = visit ? Math.round((visit.getTime() - today.getTime()) / 86_400_000) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border-2 bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <Button variant="bold" size="icon" className="h-12 w-12" onClick={() => setMonth(subMonths(month, 1))} aria-label="Oldingi oy"><ChevronLeft className="!size-7" /></Button>
          <h3 className="text-2xl font-bold capitalize">{UZ_MONTHS[month.getMonth()]} {month.getFullYear()}</h3>
          <Button variant="bold" size="icon" className="h-12 w-12" onClick={() => setMonth(addMonths(month, 1))} aria-label="Keyingi oy"><ChevronRight className="!size-7" /></Button>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center sm:gap-2">
          {UZ_WEEKDAYS_SHORT.map((d) => <div key={d} className="py-1 text-lg font-bold text-muted-foreground">{d}</div>)}
          {days.map((d) => {
            const k = dateKey(d);
            const taken = (store.intake[k] ?? []).filter((id) => store.meds.some((m) => m.id === id)).length;
            const all = store.meds.length > 0 && taken === store.meds.length;
            const isVisit = visit && isSameDay(d, visit);
            const isToday = isSameDay(d, today);
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSelected(d)}
                aria-pressed={isSameDay(d, selected)}
                aria-label={`${formatUzDate(d)}${isVisit ? ", oilaviy shifokor qabuli" : ""}${taken ? `, ${taken} ta dori ichildi` : ""}`}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 text-lg font-bold transition-colors sm:text-xl",
                  !isSameMonth(d, month) && "opacity-35",
                  all ? "border-success bg-success text-success-foreground" : taken > 0 ? "border-warning bg-highlight" : "border-transparent bg-muted",
                  isVisit && "border-accent bg-accent text-accent-foreground ring-4 ring-accent/40",
                  isToday && "ring-4 ring-primary",
                  isSameDay(d, selected) && "border-foreground",
                )}
              >
                {d.getDate()}
                {isVisit && <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" />}
                {!isVisit && all && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-base font-medium">
          <span className="flex items-center gap-2"><span className="h-5 w-5 rounded bg-success" /> Hammasi ichildi</span>
          <span className="flex items-center gap-2"><span className="h-5 w-5 rounded border-2 border-warning bg-highlight" /> Qisman</span>
          <span className="flex items-center gap-2"><span className="h-5 w-5 rounded bg-accent" /> Shifokor qabuli</span>
          <span className="flex items-center gap-2"><span className="h-5 w-5 rounded ring-4 ring-primary" /> Bugun</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className={cn("rounded-2xl border-2 p-5", visit ? "border-accent bg-highlight" : "bg-card")}>
          <p className="flex items-center gap-2 text-lg font-semibold"><Stethoscope className="h-6 w-6" /> Keyingi oilaviy shifokor qabuli</p>
          {visit ? (
            <>
              <p className="mt-1 text-3xl font-extrabold">{formatUzDate(visit, true)}</p>
              <p className="text-lg">{daysToVisit === 0 ? "Bugun!" : `${daysToVisit} kun qoldi`} — oylik retseptni yangilash uchun</p>
              <Button size="lg" variant="bold" className="mt-3 h-12 text-base" onClick={() => { setMonth(visit); setSelected(visit); }}>Taqvimda ko'rsatish</Button>
            </>
          ) : (
            <p className="mt-1 text-lg">Dori qo'shganingizdan so'ng, qabul sanasi shu yerda ko'rinadi.</p>
          )}
        </div>

        <div className="rounded-2xl border-2 bg-card p-5">
          <p className="text-xl font-bold">{formatUzDate(selected, true)}</p>
          {store.meds.length === 0 ? (
            <p className="mt-2 text-lg text-muted-foreground">Hali dori qo'shilmagan. «Dori mavjudligini tekshirish» bo'limidan «Taqvimga» tugmasini bosing.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {store.meds.map((m) => {
                const done = takenSelected.includes(m.id);
                return (
                  <li key={m.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!canLog}
                      onClick={() => store.toggleIntake(selectedKey, m.id)}
                      aria-pressed={done}
                      className={cn(
                        "flex min-h-14 flex-1 items-center gap-3 rounded-xl border-2 px-4 text-left text-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                        done ? "border-success bg-success text-success-foreground" : "border-input hover:border-primary",
                      )}
                    >
                      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2", done ? "border-success-foreground" : "border-foreground")}>
                        {done && <Check className="h-5 w-5" />}
                      </span>
                      <span>
                        {m.brand_name}{m.strength ? ` ${m.strength}` : ""}
                        <span className="block text-base font-normal">{done ? "Ichildi" : canLog ? "Ichdim deb belgilash" : "Kelajakdagi kun"}</span>
                      </span>
                    </button>
                    <Button variant="ghost" size="icon" className="h-12 w-12" aria-label={`${m.brand_name}ni taqvimdan o'chirish`} onClick={() => store.removeMedicine(m.id)}>
                      <Trash2 className="!size-6" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
