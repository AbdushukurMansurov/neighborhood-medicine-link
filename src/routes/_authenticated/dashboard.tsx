import { createFileRoute } from "@tanstack/react-router";
import { useRole, useUser } from "@/lib/auth";
import { CareDashboard } from "@/components/dashboard/CareDashboard";
import { DoctorPortal } from "@/components/portals/DoctorPortal";
import { PharmacistPortal } from "@/components/portals/PharmacistPortal";
import { DemoLoginBar } from "@/components/DemoLoginBar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Bosh panel — Averuna" },
      { name: "description", content: "Dorixonalar, bepul dorilar, e-retseptlar va 7 kunlik retsept taymeri — Averuna bosh paneli." },
      { property: "og:title", content: "Bosh panel — Averuna" },
      { property: "og:description", content: "Dorixonalar, bepul dorilar, e-retseptlar va 7 kunlik retsept taymeri — Averuna bosh paneli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const ROLE_UZ = { patient: "Bemor", doctor: "Shifokor", pharmacist: "Farmatsevt" } as const;
const ROLE_TEXT = {
  patient: "Dori, dorixona va retseptlaringiz — barchasi bir joyda.",
  doctor: "Bemorlaringizga davlat hisobidan bepul e-retsept yozing.",
  pharmacist: "E-retseptlarni tekshiring va dorini 0 so'mga bering.",
} as const;

function Dashboard() {
  const { user } = useUser();
  const { data: role, isLoading } = useRole(user?.id);
  if (!user || isLoading) return <main className="mx-auto max-w-6xl px-4 py-12 text-xl text-muted-foreground">Yuklanmoqda…</main>;
  const name = user.user_metadata?.["full_name"] || user.email;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-lg">
      <p className="text-lg font-bold uppercase tracking-wider text-primary">{role ? ROLE_UZ[role] : "Rol belgilanmagan"}</p>
      <h1 className="mt-1 text-4xl font-bold sm:text-5xl">Assalomu alaykum, {name}!</h1>
      <p className="mt-2 text-xl text-muted-foreground">{role ? ROLE_TEXT[role] : ROLE_TEXT.patient}</p>
      <DemoLoginBar current={role} className="mt-6" />
      <div className="mt-10">
        {role === "doctor" ? <DoctorPortal uid={user.id} /> : role === "pharmacist" ? <PharmacistPortal /> : <CareDashboard userId={user.id} />}
      </div>
    </main>
  );
}
