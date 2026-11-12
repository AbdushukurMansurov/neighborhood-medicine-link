import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth";

/** Shared demo accounts for one-click testing. They hold no real patient data. */
export const DEMO_ACCOUNTS: Record<AppRole, { email: string; fullName: string; label: string }> = {
  patient: { email: "demo.bemor@shifo-demo.uz", fullName: "Karimova Zulfiya (namuna bemor)", label: "Bemor" },
  doctor: { email: "demo.shifokor@shifo-demo.uz", fullName: "Dr. Rahimov Anvar (namuna shifokor)", label: "Shifokor" },
  pharmacist: { email: "demo.dorixona@shifo-demo.uz", fullName: "Toshmatova Dilnoza (namuna farmatsevt)", label: "Dorixona" },
};

const DEMO_PASSWORD = "Shifo-Namuna-2026!kirish";

async function signInOrCreate(role: AppRole) {
  const acc = DEMO_ACCOUNTS[role];
  const signIn = await supabase.auth.signInWithPassword({ email: acc.email, password: DEMO_PASSWORD });
  if (!signIn.error) return;
  const { data, error } = await supabase.auth.signUp({
    email: acc.email,
    password: DEMO_PASSWORD,
    options: { data: { full_name: acc.fullName, role } },
  });
  if (error) throw error;
  if (!data.session) throw new Error("Namuna hisobga kirib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.");
}

/** Signs in as a demo role. The demo patient is created first so doctors always have someone to prescribe for. */
export async function demoSignIn(role: AppRole) {
  if (role !== "patient") {
    const { data } = await supabase.auth.signInWithPassword({ email: DEMO_ACCOUNTS.patient.email, password: DEMO_PASSWORD });
    if (!data.session) await signInOrCreate("patient");
  }
  await signInOrCreate(role);
}
