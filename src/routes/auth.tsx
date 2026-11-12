import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ROLES, type AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Shifo" },
      { name: "description", content: "Sign in or create a Shifo account as a patient, doctor or pharmacist." },
      { property: "og:title", content: "Sign in — Shifo" },
      { property: "og:description", content: "Sign in or create a Shifo account as a patient, doctor or pharmacist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

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
    if (error) { toast.error(error.message); return; }
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
    if (error) { toast.error(error.message); return; }
    if (data.session) navigate({ to: "/dashboard" });
    else setSent(email);
  }

  return (
    <main className="bg-hero min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border bg-card p-8 shadow-soft">
          <h1 className="text-2xl font-semibold">Welcome to Shifo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in or create your account.</p>
          {sent ? (
            <p className="mt-6 rounded-lg bg-secondary p-4 text-sm text-secondary-foreground">
              Check <strong>{sent}</strong> for a confirmation link, then sign in.
            </p>
          ) : (
            <Tabs defaultValue="signin" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="mt-4 space-y-4">
                  <Field name="email" label="Email" type="email" />
                  <Field name="password" label="Password" type="password" />
                  <Button className="w-full" disabled={loading}>Sign in</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {ROLES.map((r) => (
                        <button
                          type="button"
                          key={r.value}
                          onClick={() => setRole(r.value)}
                          className={cn(
                            "rounded-lg border p-3 text-left transition-colors",
                            role === r.value ? "border-primary bg-secondary" : "hover:bg-muted",
                          )}
                        >
                          <span className="block text-sm font-semibold">{r.label}</span>
                          <span className="block text-xs text-muted-foreground">{r.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field name="full_name" label="Full name" />
                  <Field name="email" label="Email" type="email" />
                  <Field name="password" label="Password" type="password" minLength={8} />
                  <Button className="w-full" disabled={loading}>Create account</Button>
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
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required minLength={minLength} />
    </div>
  );
}
