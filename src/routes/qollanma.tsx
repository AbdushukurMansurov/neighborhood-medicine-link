import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, MessageSquareText, Pill, ShieldCheck, Stethoscope, Store, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CONDITIONS, coveredMedicines, groupByXpn } from "@/lib/conditions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/qollanma")({
  head: () => ({
    meta: [
      { title: "Reimbursatsiya qo'llanmasi — Shifo" },
      { name: "description", content: "Davlat hisobidan bepul dorini 4 qadamda qanday olish mumkin va sizning tashxisingiz bo'yicha qaysi dorilar 0 so'mga beriladi." },
      { property: "og:title", content: "Reimbursatsiya qo'llanmasi — Shifo" },
      { property: "og:description", content: "Bepul dorini 4 qadamda olish va huquqingizni tekshirish." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuidePage,
});

const STEPS = [
  {
    icon: Stethoscope,
    title: "Oilaviy shifokorga ko'rining",
    text: "Pasportingiz va tibbiy kartangiz bilan oilaviy poliklinikangizdagi shifokorga boring. Shifokor tashxisingizni tasdiqlaydi.",
    tips: ["Navbatsiz qabul uchun oldindan telefon qiling", "Oxirgi tahlil natijalaringizni oling", "Surunkali kasallik ro'yxatida turganingizni so'rang"],
  },
  {
    icon: MessageSquareText,
    title: "E-retsept va SMS kod oling",
    text: "Shifokor elektron retsept yozadi. Telefoningizga 12 xonali retsept raqami va 4 xonali SMS kod keladi. Retsept 7 kun amal qiladi.",
    tips: ["SMS kodni hech kimga bermang — faqat farmatsevtga ayting", "Smartfon bo'lmasa, retseptni qog'ozga chop ettiring", "Muddatni Shifo taqvimida kuzating"],
  },
  {
    icon: Store,
    title: "DTSJ hamkor dorixonasini toping",
    text: "Davlat dorilari faqat DTSJ bilan shartnoma tuzgan dorixonalarda 0 so'mga beriladi. Shifo xaritasida ular yashil belgi bilan ko'rsatilgan.",
    tips: ["«Mening yaqinimdagi dorixonalar» tugmasini bosing", "Dori bor-yo'qligini oldindan tekshiring", "Dori tugagan bo'lsa — o'rinbosar dorini so'rang"],
  },
  {
    icon: BadgeCheck,
    title: "OTP kod orqali 0 so'mga oling",
    text: "Farmatsevtga 12 xonali retsept raqamini ayting yoki QR kodni ko'rsating, so'ng SMS koddagi 4 raqamni ayting. Dori bepul beriladi.",
    tips: ["Pul to'lashingiz shart emas", "Dorini olgach, chekni saqlang", "Keyingi oy yana shifokorga ko'rining"],
  },
] as const;

function GuidePage() {
  const [step, setStep] = useState(0);
  const current = STEPS[step] ?? STEPS[0];
  const Icon = current.icon;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-lg">
      <p className="text-lg font-bold uppercase tracking-wider text-primary">Reimbursatsiya Qo'llanmasi</p>
      <h1 className="mt-1 text-4xl font-bold sm:text-5xl">Bepul dorini qanday olaman?</h1>
      <p className="mt-2 text-xl text-muted-foreground">Faqat 4 ta oddiy qadam. Har bir qadamni o'qib, «Keyingi» tugmasini bosing.</p>

      <section aria-label="4 qadamli qo'llanma" className="mt-8 space-y-6">
        <ol className="grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex w-full flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition-colors",
                  i === step ? "border-primary bg-secondary" : i < step ? "border-success bg-card" : "bg-card hover:bg-muted",
                )}
              >
                <span className={cn("grid h-12 w-12 place-items-center rounded-full font-display text-2xl font-bold",
                  i < step ? "bg-success text-success-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                  {i < step ? <CheckCircle2 className="h-7 w-7" /> : i + 1}
                </span>
                <span className="hidden text-base font-semibold leading-tight sm:block">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="rounded-3xl border-2 bg-card p-6 sm:p-8" aria-live="polite">
          <div className="flex flex-col gap-6 sm:flex-row">
            <span className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-primary text-primary-foreground"><Icon className="h-12 w-12" /></span>
            <div className="flex-1">
              <p className="text-lg font-bold text-primary">{step + 1}-qadam / 4</p>
              <h2 className="text-3xl font-bold">{current.title}</h2>
              <p className="mt-3 text-xl leading-relaxed">{current.text}</p>
              <ul className="mt-4 space-y-2">
                {current.tips.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-lg"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-success" />{t}</li>
                ))}
              </ul>
              {step === 2 && <Button asChild size="xl" variant="success" className="mt-5"><Link to="/pharmacies"><Store /> Hamkor dorixonalarni ko'rish</Link></Button>}
            </div>
          </div>
          <div className="mt-8 flex justify-between gap-3">
            <Button size="xl" variant="bold" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft /> Oldingi</Button>
            {step < STEPS.length - 1 ? (
              <Button size="xl" onClick={() => setStep(step + 1)}>Keyingi <ArrowRight /></Button>
            ) : (
              <Button asChild size="xl" variant="success"><a href="#huquq">Huquqni tekshirish <ArrowRight /></a></Button>
            )}
          </div>
        </div>
      </section>

      <EligibilityChecker />
    </main>
  );
}

function EligibilityChecker() {
  const [selected, setSelected] = useState<string[]>([]);
  const [none, setNone] = useState(false);
  const [checked, setChecked] = useState(false);
  const { data: medicines = [], isLoading } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medicines").select("*").order("brand_name");
      if (error) throw error;
      return data;
    },
  });

  function toggle(key: string) {
    setNone(false);
    setChecked(false);
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  const covered = groupByXpn(coveredMedicines(medicines, selected));
  const eligible = selected.length > 0;

  return (
    <section id="huquq" className="mt-14 scroll-mt-24 space-y-6">
      <div className="flex items-start gap-4 border-b-2 pb-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-foreground text-background"><ShieldCheck className="h-6 w-6" /></span>
        <div>
          <h2 className="text-3xl font-bold">Huquqni Tekshirish</h2>
          <p className="text-lg text-muted-foreground">Sizda qaysi surunkali kasallik bor? Bir yoki bir nechtasini tanlang.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CONDITIONS.map((c) => {
          const on = selected.includes(c.key);
          return (
            <button key={c.key} type="button" aria-pressed={on} onClick={() => toggle(c.key)}
              className={cn("flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-colors", on ? "border-primary bg-secondary" : "bg-card hover:bg-muted")}>
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2", on ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                {on && <CheckCircle2 className="h-5 w-5" />}
              </span>
              <span>
                <span className="block text-xl font-bold">{c.label}</span>
                <span className="block text-base text-muted-foreground">{c.hint}</span>
              </span>
            </button>
          );
        })}
        <button type="button" aria-pressed={none} onClick={() => { setSelected([]); setNone(true); setChecked(true); }}
          className={cn("rounded-2xl border-2 p-5 text-left text-xl font-bold transition-colors", none ? "border-foreground bg-muted" : "bg-card hover:bg-muted")}>
          Bularning hech biri yo'q
        </button>
      </div>

      <Button size="xl" className="w-full sm:w-auto" disabled={!eligible} onClick={() => setChecked(true)}>
        <ShieldCheck /> Natijani ko'rish
      </Button>

      {checked && (
        eligible ? (
          <div className="space-y-5 rounded-3xl border-4 border-success bg-secondary p-6" role="status">
            <p className="flex items-start gap-3 text-2xl font-bold"><CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-success" /> Tabriklaymiz! Siz davlat hisobidan bepul dorilar olish huquqiga egasiz.</p>
            <p className="text-lg">Quyidagi dorilar XPN (xalqaro patentlanmagan nom) bo'yicha DTSJ hamkor dorixonalarida <strong>0 SO'M</strong>ga beriladi:</p>
            {isLoading ? <p>Yuklanmoqda…</p> : (
              <ul className="grid gap-3 md:grid-cols-2">
                {covered.map(([xpn, ms]) => (
                  <li key={xpn} className="rounded-2xl border-2 bg-card p-4">
                    <p className="flex items-center gap-2 text-xl font-bold"><Pill className="h-5 w-5 text-primary" /> {xpn}</p>
                    <p className="mt-1 text-lg text-muted-foreground">{ms.map((m) => `${m.brand_name} ${m.strength ?? ""}`.trim()).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-3">
              <Button asChild size="xl"><Link to="/auth">Retseptlarimni kuzatish</Link></Button>
              <Button asChild size="xl" variant="bold"><Link to="/pharmacies">Hamkor dorixonalar</Link></Button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border-2 bg-card p-6" role="status">
            <p className="flex items-start gap-3 text-2xl font-bold"><XCircle className="mt-1 h-8 w-8 shrink-0 text-muted-foreground" /> Ushbu dastur bo'yicha bepul dori ro'yxatiga kirmaysiz.</p>
            <p className="mt-2 text-lg">Ammo ba'zi dorilar qisman (50%) qoplanadi. Aniq ma'lumot uchun oilaviy shifokoringizga murojaat qiling.</p>
            <Button asChild size="xl" variant="bold" className="mt-4"><Link to="/medicines">Barcha dorilarni ko'rish</Link></Button>
          </div>
        )
      )}
    </section>
  );
}
