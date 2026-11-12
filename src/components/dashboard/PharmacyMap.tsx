import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { EnrichedPharmacy, LatLng } from "@/lib/pharmacy-data";

type Props = {
  pharmacies: EnrichedPharmacy[];
  highlightedIds: string[];
  selectedId: string | null;
  userLocation: LatLng | null;
  onSelect: (id: string) => void;
};

export default function PharmacyMap({ pharmacies, highlightedIds, selectedId, userLocation, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: true }).setView([40.6, 66.8], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const points: L.LatLngExpression[] = [];
    const hasHighlight = highlightedIds.length > 0;

    for (const p of pharmacies) {
      if (p.latitude == null || p.longitude == null) continue;
      const highlighted = highlightedIds.includes(p.id);
      const cls = [
        "pharmacy-pin",
        p.is_dtsj_partner ? "pharmacy-pin--partner" : "",
        highlighted ? "pharmacy-pin--highlight" : "",
        hasHighlight && !highlighted ? "pharmacy-pin--dim" : "",
      ].join(" ");
      const size = highlighted ? 46 : 36;
      const marker = L.marker([p.latitude, p.longitude], {
        icon: L.divIcon({ className: "", html: `<div class="${cls}"><span>+</span></div>`, iconSize: [size, size], iconAnchor: [size / 2, size] }),
        title: p.name,
        zIndexOffset: highlighted ? 1000 : 0,
      })
        .bindPopup(`<strong>${p.name}</strong><br/>${p.address}, ${p.cityUz}`)
        .on("click", () => onSelectRef.current(p.id));
      marker.addTo(layer);
      if (p.id === selectedId) marker.openPopup();
      if (!hasHighlight || highlighted) points.push([p.latitude, p.longitude]);
    }

    if (userLocation) {
      L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({ className: "", html: `<div class="user-pin"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
        title: "Siz shu yerdasiz",
      })
        .bindPopup("Siz shu yerdasiz")
        .addTo(layer);
      if (!hasHighlight) points.push([userLocation.lat, userLocation.lng]);
    }

    const selected = pharmacies.find((p) => p.id === selectedId);
    if (selected?.latitude != null && selected.longitude != null) {
      map.setView([selected.latitude, selected.longitude], 14, { animate: true });
    } else if (points.length === 1 && points[0]) {
      map.setView(points[0], 13, { animate: true });
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 13 });
    }
  }, [pharmacies, highlightedIds, selectedId, userLocation]);

  return <div ref={containerRef} className="h-full w-full" role="application" aria-label="Dorixonalar xaritasi" />;
}
