import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatSom, patientPrice } from "@/lib/pharmacy-data";

export const Route = createFileRoute("/medicines")({
  head: () => ({
    meta: [
      { title: "Dorilar va reimbursatsiya — Averuna" },
      { name: "description", content: "Dorilarni savdo va XPN nomi bo'yicha qidiring: DTSJ qancha qoplashi va bemor qancha to'lashini ko'ring." },
      { property: "og:title", content: "Dorilar va reimbursatsiya — Averuna" },
      { property: "og:description", content: "Dorilarni savdo va XPN nomi bo'yicha qidiring: DTSJ qancha qoplashi va bemor qancha to'lashini ko'ring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Medicines,
});

const reimb = { full: "success", partial: "partner", none: "outline" } as const;

function Medicines() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medicines").select("*").order("brand_name");
      if (error) throw error;
      return data;
    },
  });
  const list = data.filter((m) =>
    (m.brand_name + m.generic_name_xpn).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Dorilar</h1>
      <Input className="mt-6 max-w-sm" placeholder="Savdo nomi yoki XPN bo'yicha qidirish…" value={q} onChange={(e) => setQ(e.target.value)} />
      {isLoading ? <p className="mt-6 text-muted-foreground">Yuklanmoqda…</p> : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <div key={m.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{m.brand_name}</h3>
                  <p className="text-sm text-muted-foreground">XPN: {m.generic_name_xpn}</p>
                </div>
                <Badge variant={reimb[m.reimbursement_status]}>
                  {m.reimbursement_status === "none" ? "Qoplanmaydi" : `DTSJ ${m.reimbursement_percent}% qoplaydi`}
                </Badge>
              </div>
              <p className="mt-3 text-sm">{[m.strength, m.dosage_form === "Tablet" ? "tabletka" : m.dosage_form, m.manufacturer].filter(Boolean).join(" · ")}</p>
              {m.price != null && <p className="mt-1 text-sm font-semibold">{formatSom(patientPrice(m) ?? 0)} <span className="font-normal text-muted-foreground">(bemor to'laydi)</span></p>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
