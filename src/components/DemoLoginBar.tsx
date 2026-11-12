import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical, HeartPulse, Stethoscope, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/auth";
import { DEMO_ACCOUNTS, demoSignIn } from "@/lib/demo-auth";
import { cn } from "@/lib/utils";

const ICONS = { patient: HeartPulse, doctor: Stethoscope, pharmacist: Store } as const;

/** One-click "Demo Kirish" bar: signs in as a ready demo patient, doctor or pharmacist. */
export function DemoLoginBar({ current, className }: { current?: AppRole | null; className?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<AppRole | null>(null);

  async function go(role: AppRole) {
    setBusy(role);
    try {
      qc.clear();
      await demoSignIn(role);
      toast.success(`${DEMO_ACCOUNTS[role].label} sifatida kirdingiz`);
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kirishda xatolik");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={cn("rounded-2xl border-2 border-dashed border-accent bg-highlight p-4", className)}>
      <p className="flex items-center gap-2 text-lg font-bold"><FlaskConical className="h-5 w-5" /> Demo Kirish — bir bosishda sinab ko'ring</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {(Object.keys(DEMO_ACCOUNTS) as AppRole[]).map((role) => {
          const Icon = ICONS[role];
          return (
            <Button key={role} size="xl" variant={current === role ? "default" : "bold"} disabled={busy !== null || current === role} onClick={() => go(role)}>
              <Icon /> {busy === role ? "Kirilmoqda…" : DEMO_ACCOUNTS[role].label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
