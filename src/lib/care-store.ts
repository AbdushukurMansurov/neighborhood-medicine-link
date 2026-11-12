import { useCallback, useEffect, useState } from "react";
import type { Medicine } from "@/lib/pharmacy-data";

export type TrackedMedicine = {
  id: string;
  brand_name: string;
  generic_name_xpn: string;
  strength: string | null;
  addedAt: string;
};

export type DemoPrescription = { code: string; issuedAt: string; medicineId: string };

type CareState = {
  meds: TrackedMedicine[];
  intake: Record<string, string[]>;
  demoRx: DemoPrescription | null;
};

const EMPTY: CareState = { meds: [], intake: {}, demoRx: null };

/** Per-user medicine tracker kept in this browser (no table exists for intake logs yet). */
export function useCareStore(userId: string) {
  const key = `shifo:care:${userId}`;
  const [state, setState] = useState<CareState>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      setState(raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY);
    } catch {
      setState(EMPTY);
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state, loaded]);

  const addMedicine = useCallback((m: Pick<Medicine, "id" | "brand_name" | "generic_name_xpn" | "strength">, addedAt?: string) => {
    setState((s) =>
      s.meds.some((x) => x.id === m.id)
        ? s
        : { ...s, meds: [...s.meds, { id: m.id, brand_name: m.brand_name, generic_name_xpn: m.generic_name_xpn, strength: m.strength, addedAt: addedAt ?? new Date().toISOString() }] },
    );
  }, []);

  const removeMedicine = useCallback((id: string) => {
    setState((s) => ({ ...s, meds: s.meds.filter((m) => m.id !== id) }));
  }, []);

  const toggleIntake = useCallback((day: string, medId: string) => {
    setState((s) => {
      const taken = s.intake[day] ?? [];
      const next = taken.includes(medId) ? taken.filter((x) => x !== medId) : [...taken, medId];
      return { ...s, intake: { ...s.intake, [day]: next } };
    });
  }, []);

  const setDemoRx = useCallback((demoRx: DemoPrescription | null) => setState((s) => ({ ...s, demoRx })), []);

  const isTracked = useCallback((id: string) => state.meds.some((m) => m.id === id), [state.meds]);

  return { ...state, loaded, addMedicine, removeMedicine, toggleIntake, setDemoRx, isTracked };
}

export type CareStore = ReturnType<typeof useCareStore>;
