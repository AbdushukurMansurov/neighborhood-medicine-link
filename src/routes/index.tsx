import { createFileRoute, Link } from "@tanstack/react-router";
import { FileCheck2, Pill, Stethoscope, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shifo — Digital prescriptions made simple" },
      { name: "description", content: "Doctors issue 12-digit e-prescriptions, patients track them, pharmacists dispense them in seconds." },
      { property: "og:title", content: "Shifo — Digital prescriptions made simple" },
      { property: "og:description", content: "Doctors issue 12-digit e-prescriptions, patients track them, pharmacists dispense them in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const roles = [
  { icon: FileCheck2, title: "Patients", text: "See every prescription, its 12-digit code and when it expires." },
  { icon: Stethoscope, title: "Doctors", text: "Issue prescriptions from the reimbursed medicine list in seconds." },
  { icon: Store, title: "Pharmacists", text: "Look up a code, verify validity and dispense on the spot." },
];

function Index() {
  return (
    <main>
      <section className="bg-hero">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold text-primary shadow-soft">
            <Pill className="h-3.5 w-3.5" /> E-prescriptions valid for 7 days
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] sm:text-6xl">
            One prescription code. Every step of care.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Shifo connects doctors, patients and partner pharmacies around a single 12-digit prescription.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/auth">Get started</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/pharmacies">Find a pharmacy</Link></Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-20 sm:grid-cols-3">
        {roles.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border bg-card p-6">
            <Icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
