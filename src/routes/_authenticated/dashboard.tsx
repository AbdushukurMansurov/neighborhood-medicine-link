import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { isExpired, useRole, useUser } from "@/lib/auth";
import { formatUzDate } from "@/lib/prescription-timer";
import { CareDashboard } from "@/components/dashboard/CareDashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Bosh panel — Shifo" },
      { name: "description", content: "Dorixonalar, bepul dorilar va 7 kunlik retsept taymeri — Shifo bosh paneli." },
      { property: "og:title", content: "Bosh panel — Shifo" },
      { property: "og:description", content: "Dorixonalar, bepul dorilar va 7 kunlik retsept taymeri — Shifo bosh paneli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type Rx = Database["public"]["Tables"]["prescriptions"]["Row"] & {
  medicines: { brand_name: string; generic_name_xpn: string } | null;
};

const ROLE_UZ = { patient: "Bemor", doctor: "Shifokor", pharmacist: "Farmatsevt" } as const;

function Dashboard() {
  const { user } = useUser();
  const { data: role, isLoading } = useRole(user?.id);
  if (!user || isLoading) return <main className="mx-auto max-w-6xl px-4 py-12 text-xl text-muted-foreground">Yuklanmoqda…</main>;
  const name = user.user_metadata?.["full_name"] || user.email;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-lg">
      <p className="text-lg font-bold uppercase tracking-wider text-primary">{role ? ROLE_UZ[role] : "Rol belgilanmagan"}</p>
      <h1 className="mt-1 text-4xl font-bold sm:text-5xl">Assalomu alaykum, {name}!</h1>
      <p className="mt-2 text-xl text-muted-foreground">Dori, dorixona va retseptlaringiz — barchasi bir joyda.</p>
      {(role === "doctor" || role === "pharmacist") && (
        <section className="mt-10 rounded-3xl border-2 bg-muted/50 p-5 sm:p-8">
          {role === "doctor" && <DoctorView uid={user.id} />}
          {role === "pharmacist" && <PharmacistView uid={user.id} />}
        </section>
      )}
      <div className="mt-10">
        <CareDashboard userId={user.id} />
      </div>
    </main>
  );
}

function StatusBadge({ rx }: { rx: Rx }) {
  if (rx.status === "dispensed") return <Badge variant="secondary">Berilgan</Badge>;
  if (rx.status === "cancelled") return <Badge variant="outline">Bekor qilingan</Badge>;
  if (isExpired(rx.expires_at)) return <Badge variant="destructive">Muddati tugagan</Badge>;
  return <Badge variant="success">Faol</Badge>;
}

function RxCard({ rx, children }: { rx: Rx; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-lg tracking-widest">{rx.code.replace(/(\d{4})(?=\d)/g, "$1 ")}</p>
          <p className="mt-1 font-semibold">{rx.medicines?.brand_name} <span className="font-normal text-muted-foreground">· {rx.medicines?.generic_name_xpn}</span></p>
        </div>
        <StatusBadge rx={rx} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Soni: {rx.quantity}{rx.dosage ? ` · ${rx.dosage}` : ""} · Berilgan: {formatUzDate(new Date(rx.issued_at))} · Tugaydi: {formatUzDate(new Date(rx.expires_at))}
      </p>
      {children}
    </div>
  );
}

const RX_SELECT = "*, medicines(brand_name, generic_name_xpn)";

function useRxList(key: string, column: "patient_id" | "doctor_id", uid: string) {
  return useQuery({
    queryKey: ["rx", key, uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("prescriptions").select(RX_SELECT).eq(column, uid).order("issued_at", { ascending: false });
      if (error) throw error;
      return data as Rx[];
    },
  });
}

function DoctorView({ uid }: { uid: string }) {
  const qc = useQueryClient();
  const { data = [] } = useRxList("doctor", "doctor_id", uid);
  const { data: meds = [] } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => (await supabase.from("medicines").select("*").order("brand_name")).data ?? [],
  });
  const [busy, setBusy] = useState(false);

  async function issue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    const { data: rx, error } = await supabase.from("prescriptions").insert({
      doctor_id: uid,
      patient_id: String(f.get("patient_id")).trim(),
      medicine_id: String(f.get("medicine_id")),
      quantity: Number(f.get("quantity")) || 1,
      dosage: String(f.get("dosage")) || null,
      code: "",
      expires_at: new Date().toISOString(),
    }).select("code").single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rx.code} raqamli retsept yozildi`);
    form.reset();
    qc.invalidateQueries({ queryKey: ["rx"] });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <form onSubmit={issue} className="space-y-4 rounded-2xl border bg-card p-6 h-fit">
        <h2 className="text-2xl font-bold">Retsept yozish</h2>
        <div className="space-y-2"><Label htmlFor="patient_id" className="text-base">Bemor ID raqami</Label><Input id="patient_id" name="patient_id" required pattern="[0-9a-fA-F-]{36}" /></div>
        <div className="space-y-2">
          <Label htmlFor="medicine_id" className="text-base">Dori</Label>
          <select id="medicine_id" name="medicine_id" required className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {meds.map((m) => <option key={m.id} value={m.id}>{m.brand_name} ({m.generic_name_xpn}) {m.strength}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label htmlFor="quantity" className="text-base">Soni</Label><Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} /></div>
          <div className="space-y-2"><Label htmlFor="dosage" className="text-base">Qabul tartibi</Label><Input id="dosage" name="dosage" placeholder="Kuniga 1 marta" /></div>
        </div>
        <p className="text-xs text-muted-foreground">12 xonali kod avtomatik yaratiladi; retsept 7 kun amal qiladi.</p>
        <Button size="xl" className="w-full" disabled={busy}>Retsept yozish</Button>
      </form>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Yozilgan retseptlar</h2>
        {data.length === 0 ? <p className="text-muted-foreground">Hozircha yo'q.</p> : data.map((rx) => <RxCard key={rx.id} rx={rx} />)}
      </section>
    </div>
  );
}

function PharmacistView({ uid }: { uid: string }) {
  const [code, setCode] = useState("");
  const [rx, setRx] = useState<Rx | null | undefined>(undefined);
  const { data: pharmacies = [] } = useQuery({
    queryKey: ["pharmacies"],
    queryFn: async () => (await supabase.from("pharmacies").select("*").order("name")).data ?? [],
  });
  const [pharmacyId, setPharmacyId] = useState("");

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.replace(/\D/g, "");
    if (clean.length !== 12) { toast.error("Kod 12 ta raqamdan iborat bo'lishi kerak"); return; }
    const { data } = await supabase.from("prescriptions").select(RX_SELECT).eq("code", clean).maybeSingle();
    setRx((data as Rx) ?? null);
  }

  async function dispense() {
    if (!rx) return;
    const { data, error } = await supabase.from("prescriptions")
      .update({ status: "dispensed", dispensed_by: uid, pharmacy_id: pharmacyId || null })
      .eq("id", rx.id).select(RX_SELECT).single();
    if (error) { toast.error(error.message); return; }
    setRx(data as Rx);
    toast.success("Dori berildi");
  }

  const canDispense = rx && rx.status === "active" && !isExpired(rx.expires_at);
  return (
    <section className="max-w-xl space-y-6">
      <h2 className="text-2xl font-bold">Retseptni tekshirish va dori berish</h2>
      <form onSubmit={lookup} className="flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="12 xonali kodni kiriting" aria-label="Retsept kodi" inputMode="numeric" className="h-14 font-mono text-xl tracking-widest" />
        <Button size="xl">Qidirish</Button>
      </form>
      {rx === null && <p className="text-muted-foreground">Bu kod bo'yicha retsept topilmadi.</p>}
      {rx && (
        <RxCard rx={rx}>
          {canDispense && (
            <div className="mt-4 flex gap-2">
              <select value={pharmacyId} onChange={(e) => setPharmacyId(e.target.value)} className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Dorixonani tanlang…</option>
                {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}, {p.city}</option>)}
              </select>
              <Button size="xl" onClick={dispense}>Dori berish</Button>
            </div>
          )}
        </RxCard>
      )}
    </section>
  );
}
