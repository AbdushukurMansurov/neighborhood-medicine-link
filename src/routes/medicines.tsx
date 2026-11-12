import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/medicines")({
  head: () => ({
    meta: [
      { title: "Medicines & reimbursement — Shifo" },
      { name: "description", content: "Browse medicines by brand and generic (XPN) name with reimbursement status." },
      { property: "og:title", content: "Medicines & reimbursement — Shifo" },
      { property: "og:description", content: "Browse medicines by brand and generic (XPN) name with reimbursement status." },
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
      <h1 className="text-3xl font-semibold">Medicines</h1>
      <Input className="mt-6 max-w-sm" placeholder="Search brand or generic name…" value={q} onChange={(e) => setQ(e.target.value)} />
      {isLoading ? <p className="mt-6 text-muted-foreground">Loading…</p> : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <div key={m.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{m.brand_name}</h3>
                  <p className="text-sm text-muted-foreground">XPN: {m.generic_name_xpn}</p>
                </div>
                <Badge variant={reimb[m.reimbursement_status]}>
                  {m.reimbursement_status === "none" ? "Not reimbursed" : `${m.reimbursement_percent}% reimbursed`}
                </Badge>
              </div>
              <p className="mt-3 text-sm">{[m.strength, m.dosage_form, m.manufacturer].filter(Boolean).join(" · ")}</p>
              {m.price != null && <p className="mt-1 text-sm font-semibold">{Number(m.price).toLocaleString()} UZS</p>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
