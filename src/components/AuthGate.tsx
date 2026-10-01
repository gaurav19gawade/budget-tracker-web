"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AUTH_ENABLED } from "@/lib/config";
import { getSupabase } from "@/lib/supabase";

type Status = "loading" | "signedIn" | "signedOut";

/**
 * Client-side convenience gate: sends signed-out visitors to the login page.
 * Real protection is the API, which rejects every request without a valid token.
 * In local mode (no Supabase configured) it lets everything through.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(AUTH_ENABLED ? "loading" : "signedIn");

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    const supabase = getSupabase();

    void supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "signedIn" : "signedOut");
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "signedIn" : "signedOut");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (status === "signedOut") {
      const next = window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [status, router]);

  if (status !== "signedIn") {
    return <p className="p-8 text-sm text-zinc-500">Loading...</p>;
  }
  return <>{children}</>;
}
