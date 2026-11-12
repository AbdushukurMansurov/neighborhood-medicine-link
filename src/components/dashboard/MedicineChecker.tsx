import { useMemo, useState } from "react";
import { CalendarPlus, Check, MapPinned, Search, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  formatSom, isFreeMedicine, matchesMedicine, patientPrice, pharmaciesWithStock,
  type EnrichedPharmacy, type Medicine,
} from "@/lib/pharmacy-data";
import { cn } from "@/lib/utils";

type Props = {
  medicines: Medicine[];
  pharmacies: EnrichedPharmacy[];
  loading: boolean;
  onGetFree: (m: Medicine) => void;
  onAddToCalendar: (m: Medicine) => void;
  isTracked: (medicineId: string) => boolean;
};

export function MedicineChecker({ medicines, pharmacies, loading, onGetFree, onAddToCalendar, isTracked }: Props) {
  const [query, setQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);

  const results = useMemo(
    () => medicines.filter((m) => matchesMedicine(m, query) && (!freeOnly || isFreeMedicine(m))),
    [medicines, query, freeOnly],
  );

  return (
    <div className="space-y-5">
      <label className="relative block">
        <span className="sr-only">Dori qidirish</span>
        <Search className="pointer-events-none absolute left-5 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Dori nomi yoki XPN (masalan: Panadol, Metformin)"
          className="h-16 w-full rounded-2xl border-2 border-input bg-card pl-16 pr-5 text-xl font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </label>

      <label
        htmlFor="free-only"
        className={cn(
          "flex cursor-pointer items-center gap-5 rounded-2xl border-2 p-5 transition-colors",
          freeOnly ? "border-success bg-secondary" : "bg-card",
        )}
      >
        <Switch id="free-only" size="lg" checked={freeOnly} onCheckedChange={setFreeOnly} />
        <span>
          <span className="block text-xl font-bold">Faqat Davlat reimbursatsiyasi (Bepul dorilar)</span>
          <span className="block text-lg text-muted-foreground">DTSJ orqali 0 so'mga beriladigan dorilar va ular bor dorixonalar</span>
        </span>
      </label>

      {loading ? (
        <p className="text-lg text-muted-foreground">Dorilar yuklanmoqda…</p>
      ) : results.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-6 text-lg">«{query}» bo'yicha dori topilmadi.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {results.map((m) => (
            <MedicineCard
              key={m.id}
              m={m}
              stock={pharmaciesWithStock(m, pharmacies)}
              showStock={freeOnly}
              tracked={isTracked(m.id)}
              onGetFree={() => onGetFree(m)}
              onAddToCalendar={() => onAddToCalendar(m)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function MedicineCard({ m, stock, showStock, tracked, onGetFree, onAddToCalendar }: {
  m: Medicine; stock: EnrichedPharmacy[]; showStock: boolean; tracked: boolean; onGetFree: () => void; onAddToCalendar: () => void;
}) {
  const free = isFreeMedicine(m);
  const price = patientPrice(m);
  return (
    <li className={cn("flex min-w-0 flex-col rounded-2xl border-2 bg-card p-5", free && "border-success")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-bold">{m.brand_name}</h3>
          <p className="text-lg text-muted-foreground">XPN: {m.generic_name_xpn}</p>
          <p className="text-lg">{[m.strength, m.dosage_form === "Tablet" ? "tabletka" : m.dosage_form].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right">
          {price != null && (
            <p className={cn("text-2xl font-extrabold", free ? "text-success" : "text-foreground")}>{formatSom(price)}</p>
          )}
          <Badge variant={free ? "success" : m.reimbursement_status === "partial" ? "partner" : "outline"} className="mt-1 text-sm">
            {free ? "DTSJ 100% qoplaydi" : m.reimbursement_status === "partial" ? `DTSJ ${m.reimbursement_percent}% qoplaydi` : "Qoplanmaydi"}
          </Badge>
        </div>
      </div>

      {(showStock || free) && (
        <div className="mt-4 rounded-xl bg-muted p-4">
          <p className="flex items-center gap-2 text-lg font-semibold"><Store className="h-5 w-5" />
            {stock.length > 0 ? `Hozir mavjud (${stock.length} ta ${free ? "hamkor " : ""}dorixonada):` : "Hozircha hech qayerda yo'q"}
          </p>
          {stock.length > 0 && (
            <ul className="mt-2 space-y-1 text-lg">
              {stock.map((p) => <li key={p.id}>• {p.name} — {p.cityUz}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-3 pt-4">
        {free && stock.length > 0 && (
          <Button size="xl" variant="success" className="flex-1" onClick={onGetFree}>
            <MapPinned /> Yaqin dorixonadan bepul olish
          </Button>
        )}
        <Button size="xl" variant={tracked ? "outline" : "bold"} disabled={tracked} onClick={onAddToCalendar} className={cn(!free && "flex-1")}>
          {tracked ? <><Check /> Taqvimda</> : <><CalendarPlus /> Taqvimga</>}
        </Button>
      </div>
    </li>
  );
}
