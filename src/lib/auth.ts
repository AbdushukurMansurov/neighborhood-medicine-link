import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export const ROLES: { value: AppRole; label: string; hint: string }[] = [
  { value: "patient", label: "Patient", hint: "View your prescriptions" },
  { value: "doctor", label: "Doctor", hint: "Issue prescriptions" },
  { value: "pharmacist", label: "Pharmacist", hint: "Verify & dispense" },
];

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, ready };
}

export function useRole(userId: string | undefined) {
  return useQuery({
    queryKey: ["role", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      if (error) throw error;
      const roles = (data ?? []).map((r) => r.role);
      return (["doctor", "pharmacist", "patient"] as AppRole[]).find((r) => roles.includes(r)) ?? null;
    },
  });
}

export function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() < Date.now();
}
