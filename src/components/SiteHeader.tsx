import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Cross } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";

export function SiteHeader() {
  const { user, ready } = useUser();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const link = "text-base font-semibold text-muted-foreground hover:text-foreground transition-colors";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Cross className="h-4 w-4" />
          </span>
          Shifo
        </Link>
        <nav className="hidden gap-5 sm:flex">
          <Link to="/medicines" className={link} activeProps={{ className: "text-foreground" }}>Dorilar</Link>
          <Link to="/pharmacies" className={link} activeProps={{ className: "text-foreground" }}>Dorixonalar</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {ready && user ? (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/dashboard">Bosh panel</Link></Button>
              <Button variant="outline" size="sm" onClick={signOut}>Chiqish</Button>
            </>
          ) : ready ? (
            <Button asChild size="sm"><Link to="/auth">Kirish</Link></Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
