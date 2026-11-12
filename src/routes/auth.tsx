import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoLoginBar } from "@/components/DemoLoginBar";
import { supabase } from "@/integrations/supabase/client";
import { ROLES, type AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Kirish va ro'yxatdan o'tish — Averuna" },
      { name: "description", content: "Averuna'ga bemor, shifokor yoki farmatsevt sifatida kiring yoki yangi hisob oching." },
      { property: "og:title", content: "Kirish va ro'yxatdan o'tish — Averuna" },
      { property: "og:description", content: "Averuna'ga bemor, shifokor yoki farmatsevt sifatida kiring yoki yangi hisob oching." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function uzError(message: string) {
  if (/invalid login credentials/i.test(message)) return "Email yoki parol noto'g'ri.";
  if (/already registered|already exists/i.test(message)) return "Bu email bilan hisob allaqachon mavjud. «Kirish» bo'limidan foydalaning.";
  if (/password/i.test(message) && /(weak|pwned|leaked|known)/i.test(message)) return "Bu parol juda oddiy yoki oshkor bo'lgan. Boshqa, murakkabroq parol tanlang.";
  if (/at least/i.test(message)) return "Parol kamida 8 ta belgidan iborat bo'lishi kerak.";
  return "Xatolik yuz berdi: " + message;
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<AppRole>("patient");
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setLoading(false);
    if (error) { toast.error(uzError(error.message)); return; }
    navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: String(f.get("password")),
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: String(f.get("full_name")), role },
      },
    });
    setLoading(false);
    if (error) { toast.error(uzError(error.message)); return; }
    if (data.session) { toast.success("Hisobingiz yaratildi. Xush kelibsiz!"); navigate({ to: "/dashboard" }); }
    else setSent(email);
  }

  return (
    <main className="bg-hero min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-lg px-4 py-12 sm:py-16">
        <DemoLoginBar className="mb-6" />
        <div className="rounded-2xl border bg-card p-6 shadow-soft sm:p-8">
          <h1 className="text-3xl font-semibold">Averuna'ga xush kelibsiz</h1>
          <p className="mt-1 text-lg text-muted-foreground">Hisobingizga kiring yoki yangi hisob oching.</p>
          {sent ? (
            <p className="mt-6 rounded-lg bg-secondary p-4 text-lg text-secondary-foreground">
              <strong>{sent}</strong> manziliga tasdiqlash havolasi yuborildi. Havolani bosing, so'ng tizimga kiring.
            </p>
          ) : (
            <Tabs defaultValue="signin" className="mt-6">
              <TabsList className="grid h-12 w-full grid-cols-2">
                <TabsTrigger value="signin" className="text-base">Kirish</TabsTrigger>
                <TabsTrigger value="signup" className="text-base">Ro'yxatdan o'tish</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="mt-4 space-y-4">
                  <Field name="email" label="Elektron pochta" type="email" />
                  <Field name="password" label="Parol" type="password" />
                  <Button size="xl" className="w-full" disabled={loading}>{loading ? "Kirilmoqda…" : "Kirish"}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base">Men —</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {ROLES.map((r) => (
                        <button
                          type="button"
                          key={r.value}
                          onClick={() => setRole(r.value)}
                          aria-pressed={role === r.value}
                          className={cn(
                            "rounded-lg border-2 p-3 text-left transition-colors",
                            role === r.value ? "border-primary bg-secondary" : "hover:bg-muted",
                          )}
                        >
                          <span className="block text-base font-semibold">{r.label}</span>
                          <span className="block text-xs text-muted-foreground">{r.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field name="full_name" label="To'liq ism-sharif" />
                  <Field name="email" label="Elektron pochta" type="email" />
                  <Field name="password" label="Parol (kamida 8 belgi)" type="password" minLength={8} />
                  <Button size="xl" className="w-full" disabled={loading}>{loading ? "Yaratilmoqda…" : "Hisob yaratish"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ name, label, type = "text", minLength }: { name: string; label: string; type?: string; minLength?: number }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-base">{label}</Label>
      <Input id={name} name={name} type={type} required minLength={minLength} className="h-12 text-lg" />
    </div>
  );
}
