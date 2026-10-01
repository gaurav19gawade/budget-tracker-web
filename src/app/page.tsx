"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, ErrorText, inputClass } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";
import type { Me } from "@/lib/types";
import { useMe } from "@/lib/useMe";

const stats = [
  { label: "Money in (this month)", value: "--" },
  { label: "Money out (this month)", value: "--" },
  { label: "Budget remaining", value: "--" },
];

/** Accepts either the full invite link or just the token. */
function extractToken(input: string): string {
  const trimmed = input.trim();
  try {
    return new URL(trimmed).searchParams.get("token") ?? trimmed;
  } catch {
    return trimmed;
  }
}

function NoHousehold({ me, onDone }: { me: Me; onDone: () => void }) {
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Join your household</h1>
      <p className="text-sm text-zinc-500">
        You are signed in as {me.email}, but you are not part of a household yet.
      </p>

      <Card>
        <h2 className="mb-2 font-medium">I have an invite</h2>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Paste the invite link or code"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
          />
          <Button
            disabled={busy || invite.trim() === ""}
            onClick={() =>
              run(() =>
                apiFetch("/api/invites/redeem", {
                  method: "POST",
                  body: JSON.stringify({ token: extractToken(invite) }),
                }),
              )
            }
          >
            Join
          </Button>
        </div>
      </Card>

      {me.canCreateHousehold ? (
        <Card>
          <h2 className="mb-1 font-medium">You are the owner</h2>
          <p className="mb-3 text-sm text-zinc-500">Create the household, then invite your partner.</p>
          <Button disabled={busy} onClick={() => run(() => apiFetch("/api/households", { method: "POST" }))}>
            Create household
          </Button>
        </Card>
      ) : (
        <Card>
          <h2 className="mb-1 font-medium">Setting this up as the owner?</h2>
          <p className="text-sm text-zinc-500">
            Set <code>BOOTSTRAP_OWNER_USER_ID</code> on the server to the ID below and redeploy, then reload this page.
          </p>
          <code className="mt-2 block break-all rounded bg-zinc-100 p-2 text-xs dark:bg-zinc-900">{me.userId}</code>
        </Card>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

function Dashboard({ me }: { me: Me }) {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{me.household?.name ?? "Dashboard"}</h1>
        <p className="text-sm text-zinc-500">Analytics arrive in a later phase.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Monthly summary">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-sm text-zinc-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </section>

      <section className="mt-8" aria-label="Top expenses">
        <h2 className="mb-3 text-lg font-medium">Top expenses</h2>
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No data yet. Connect an account to get started.
        </div>
      </section>
    </div>
  );
}

function Home() {
  const { me, error, loading, reload } = useMe();

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;
  if (error || !me) {
    return (
      <div className="space-y-3">
        <ErrorText>{error ?? "Could not load your profile."}</ErrorText>
        <Button variant="secondary" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }
  return me.household ? <Dashboard me={me} /> : <NoHousehold me={me} onDone={reload} />;
}

export default function HomePage() {
  return (
    <AuthGate>
      <AppShell>
        <Home />
      </AppShell>
    </AuthGate>
  );
}
