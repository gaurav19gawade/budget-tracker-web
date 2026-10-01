"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, ErrorText, inputClass } from "@/components/ui";
import { AUTH_ENABLED } from "@/lib/config";
import { getSupabase } from "@/lib/supabase";

type Mode = "signin" | "signup";

/** Only allow same-site relative redirects. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!AUTH_ENABLED) {
    return (
      <div className="mx-auto max-w-sm p-8">
        <Card>
          <p className="text-sm">Sign-in is turned off because Supabase is not configured (local mode).</p>
          <Button className="mt-3" onClick={() => router.replace("/")}>
            Continue
          </Button>
        </Card>
      </div>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = getSupabase();
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Account created. Check your email to confirm it, then sign in.");
          setMode("signin");
          return;
        }
      }
      const next = safeNext(new URLSearchParams(window.location.search).get("next"));
      router.replace(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-sm flex-1 flex-col justify-center p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Budget Tracker</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {mode === "signin" ? "Sign in to your household." : "Create your account. You will need an invite to join a household."}
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm">
          Email
          <input
            className={`${inputClass} mt-1`}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className={`${inputClass} mt-1`}
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <ErrorText>{error}</ErrorText>}
        {notice && <p className="text-sm text-green-700 dark:text-green-400">{notice}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <button
        type="button"
        className="mt-4 text-left text-sm text-zinc-600 underline dark:text-zinc-400"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setNotice(null);
        }}
      >
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
