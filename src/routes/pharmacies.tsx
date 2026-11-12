import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pharmacies")({
  head: () => ({
    meta: [
      { title: "Pharmacies near you — Shifo" },
      { name: "description", content: "Find pharmacies, their locations and DTSJ partner status." },
      { property: "og:title", content: "Pharmacies near you — Shifo" },
      { property: "og:description", content: "Find pharmacies, their locations and DTSJ partner status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pharmacies,
});

function Pharmacies() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["pharmacies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pharmacies").select("*").order("is_dtsj_partner", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Pharmacies</h1>
      {isLoading ? <p className="mt-6 text-muted-foreground">Loading…</p> : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {data.map((p) => (
            <div key={p.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                {p.is_dtsj_partner && (
                  <Badge variant="partner" className="gap-1"><BadgeCheck className="h-3.5 w-3.5" /> DTSJ partner</Badge>
                )}
              </div>
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{p.address}, {p.city}</p>
              {p.phone && <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" />{p.phone}</p>}
              {p.latitude != null && p.longitude != null && (
                <a className="mt-3 inline-block text-sm font-medium text-primary hover:underline" target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}>Open in maps</a>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
