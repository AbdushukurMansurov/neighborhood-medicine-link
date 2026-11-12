import { Suspense, lazy, useMemo, useState } from "react";
import { BadgeCheck, CalendarPlus, Clock, LocateFixed, MapPin, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOCATION, distanceKm, type EnrichedPharmacy, type LatLng, type Medicine } from "@/lib/pharmacy-data";
import { cn } from "@/lib/utils";

const PharmacyMap = lazy(() => import("./PharmacyMap"));

export type MapHighlight = { medicine: Medicine; pharmacyIds: string[] };

type Props = {
  pharmacies: EnrichedPharmacy[];
  highlight: MapHighlight | null;
  onClearHighlight: () => void;
  onAddToCalendar: (m: Medicine) => void;
  isTracked: (medicineId: string) => boolean;
};

const ALL = "";

export function PharmacyFinder({ pharmacies, highlight, onClearHighlight, onAddToCalendar, isTracked }: Props) {
  const [region, setRegion] = useState(ALL);
  const [district, setDistrict] = useState(ALL);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const regions = useMemo(() => [...new Set(pharmacies.map((p) => p.region))], [pharmacies]);
  const districts = useMemo(
    () => [...new Set(pharmacies.filter((p) => !region || p.region === region).map((p) => p.district))],
    [pharmacies, region],
  );

  const list = useMemo(() => {
    let items = pharmacies.filter((p) => (!region || p.region === region) && (!district || p.district === district));
    if (highlight) items = pharmacies.filter((p) => highlight.pharmacyIds.includes(p.id));
    const withDistance = items.map((p) => ({
      p,
      km: userLocation && p.latitude != null && p.longitude != null
        ? distanceKm(userLocation, { lat: p.latitude, lng: p.longitude })
        : null,
    }));
    if (userLocation) withDistance.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
    return withDistance;
  }, [pharmacies, region, district, highlight, userLocation]);

  function nearMe() {
    setRegion(ALL);
    setDistrict(ALL);
    setSelectedId(null);
    if (!("geolocation" in navigator)) {
      setUserLocation(DEFAULT_LOCATION);
      toast.info("Joylashuvni aniqlab bo'lmadi. Toshkent markazi bo'yicha ko'rsatildi.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setUserLocation(DEFAULT_LOCATION);
        setLocating(false);
        toast.info("Joylashuvga ruxsat berilmadi. Toshkent markazi bo'yicha ko'rsatildi.");
      },
      { timeout: 8000 },
    );
  }

  const tracked = highlight ? isTracked(highlight.medicine.id) : false;
  const selectCls = "h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg font-medium text-foreground focus:border-primary focus:outline-none";

  return (
    <div className="space-y-5">
      {highlight && (
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-accent bg-highlight p-5 sm:flex-row sm:items-center" role="status">
          <div className="flex-1">
            <p className="text-xl font-bold">«{highlight.medicine.brand_name}» — bepul olish mumkin</p>
            <p className="mt-1 text-lg">
              Xaritada <strong>{highlight.pharmacyIds.length} ta</strong> DTSJ hamkor dorixona sariq rangda belgilandi.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="xl" variant={tracked ? "outline" : "default"} disabled={tracked} onClick={() => onAddToCalendar(highlight.medicine)}>
              <CalendarPlus /> {tracked ? "Taqvimda bor" : "Taqvimga qo'shish"}
            </Button>
            <Button size="xl" variant="bold" onClick={onClearHighlight} aria-label="Belgilashni tozalash">
              <X /> Tozalash
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-1.5">
          <span className="block text-lg font-semibold">Viloyat</span>
          <select className={selectCls} value={region} disabled={!!highlight}
            onChange={(e) => { setRegion(e.target.value); setDistrict(ALL); setSelectedId(null); }}>
            <option value={ALL}>Barcha viloyatlar</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block text-lg font-semibold">Tuman</span>
          <select className={selectCls} value={district} disabled={!!highlight}
            onChange={(e) => { setDistrict(e.target.value); setSelectedId(null); }}>
            <option value={ALL}>Barcha tumanlar</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <Button size="xl" variant="success" className="w-full" onClick={nearMe} disabled={locating}>
            <LocateFixed /> {locating ? "Aniqlanmoqda…" : "Mening yaqinimdagi dorixonalar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="relative z-0 h-[380px] overflow-hidden rounded-2xl border-2 bg-muted lg:h-[560px]">
          <Suspense fallback={<div className="grid h-full place-items-center text-lg text-muted-foreground">Xarita yuklanmoqda…</div>}>
            <PharmacyMap
              pharmacies={pharmacies}
              highlightedIds={highlight?.pharmacyIds ?? []}
              selectedId={selectedId}
              userLocation={userLocation}
              onSelect={setSelectedId}
            />
          </Suspense>
        </div>

        <ul className="space-y-4 lg:max-h-[560px] lg:overflow-y-auto lg:pr-1" aria-label="Dorixonalar ro'yxati">
          {list.length === 0 && <li className="rounded-2xl border-2 border-dashed p-6 text-lg">Bu hududda dorixona topilmadi.</li>}
          {list.map(({ p, km }) => (
            <PharmacyCard
              key={p.id}
              p={p}
              km={km}
              selected={p.id === selectedId}
              highlighted={!!highlight?.pharmacyIds.includes(p.id)}
              freeMedicine={highlight?.medicine.brand_name}
              onSelect={() => setSelectedId(p.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function PharmacyCard({ p, km, selected, highlighted, freeMedicine, onSelect }: {
  p: EnrichedPharmacy; km: number | null; selected: boolean; highlighted: boolean; freeMedicine: string | undefined; onSelect: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-2xl border-2 bg-card p-5 transition-shadow",
        highlighted && "border-accent bg-highlight",
        selected && "border-primary shadow-lift",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-xl font-bold">{p.name}</h3>
        {p.is_dtsj_partner && (
          <Badge variant="success" className="gap-1.5 rounded-full px-3 py-1 text-sm">
            <BadgeCheck className="h-4 w-4" /> DTSJ Hamkori
          </Badge>
        )}
      </div>
      {highlighted && freeMedicine && (
        <p className="mt-2 text-lg font-semibold">«{freeMedicine}» hozir mavjud — 0 SO'M</p>
      )}
      <dl className="mt-3 space-y-2 text-lg">
        <div className="flex gap-3"><dt className="sr-only">Manzil</dt><MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" /><dd>{p.address}, {p.cityUz} · {p.district}</dd></div>
        <div className="flex gap-3"><dt className="sr-only">Ish vaqti</dt><Clock className="mt-1 h-5 w-5 shrink-0 text-primary" /><dd>{p.hours}</dd></div>
        {p.phone && (
          <div className="flex gap-3"><dt className="sr-only">Telefon</dt><Phone className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <dd><a className="font-semibold underline-offset-4 hover:underline" href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a></dd>
          </div>
        )}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="bold" size="lg" className="h-12 text-base" onClick={onSelect}>Xaritada ko'rish</Button>
        {km != null && <span className="text-lg font-semibold text-muted-foreground">{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} uzoqlikda</span>}
      </div>
    </li>
  );
}
