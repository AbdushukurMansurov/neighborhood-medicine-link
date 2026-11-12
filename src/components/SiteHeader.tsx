import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import logo from "@/assets/averuna-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useLargeMode } from "@/lib/large-mode";

export function SiteHeader() {
  const { user, ready } = useUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const large = useLargeMode();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const link = "text-base font-semibold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Averuna — bosh sahifa">
          <img src={logo.url} alt="Averuna Pharmacy" width={900} height={213} className="h-10 w-auto sm:h-11" />
        </Link>
        <div className="ml-auto flex items-center gap-2 sm:order-last">
          <Button
            variant={large.on ? "default" : "bold"}
            size="sm"
            className="h-10 px-3 text-base"
            aria-pressed={large.on}
            onClick={large.toggle}
            title="Kattalashtirilgan rejim"
          >
            A+ <span className="hidden md:inline">Kattaroq shrift</span>
          </Button>
          {ready && user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="h-10 text-base"><Link to="/dashboard">Bosh panel</Link></Button>
              <Button variant="outline" size="sm" className="h-10 text-base" onClick={signOut}>Chiqish</Button>
            </>
          ) : ready ? (
            <Button asChild size="sm" className="h-10 text-base"><Link to="/auth">Kirish</Link></Button>
          ) : null}
        </div>
        <nav className="order-last flex w-full gap-5 overflow-x-auto pb-1 sm:order-none sm:w-auto sm:pb-0" aria-label="Asosiy menyu">
          <Link to="/qollanma" className={link} activeProps={{ className: "text-foreground" }}>Qo'llanma</Link>
          <Link to="/medicines" className={link} activeProps={{ className: "text-foreground" }}>Dorilar</Link>
          <Link to="/pharmacies" className={link} activeProps={{ className: "text-foreground" }}>Dorixonalar</Link>
        </nav>
      </div>
    </header>
  );
}
