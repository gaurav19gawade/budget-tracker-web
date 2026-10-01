"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, ErrorText } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { CreatedInvite, Invite } from "@/lib/types";
import { useMe } from "@/lib/useMe";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function Invites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [fresh, setFresh] = useState<{ link: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Invite[]>("/api/households/invites")
      .then((data) => {
        if (!cancelled) setInvites(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load invites.");
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const load = useCallback(() => setVersion((v) => v + 1), []);

  async function createInvite() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const created = await apiFetch<CreatedInvite>("/api/households/invites", { method: "POST" });
      setFresh({
        link: `${window.location.origin}/join?token=${encodeURIComponent(created.token)}`,
        expiresAt: created.expiresAt,
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the invite.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      await apiFetch(`/api/households/invites/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke the invite.");
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("Could not copy automatically. Select the link and copy it by hand.");
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Invite your partner</h2>
        <Button onClick={createInvite} disabled={busy}>
          Create invite link
        </Button>
      </div>

      {fresh && (
        <Card className="space-y-2">
          <p className="text-sm">
            Send this link to your partner. It works once, expires on {formatDate(fresh.expiresAt)}, and is shown only now.
          </p>
          <code className="block break-all rounded bg-zinc-100 p-2 text-xs dark:bg-zinc-900">{fresh.link}</code>
          <Button variant="secondary" onClick={() => copy(fresh.link)}>
            {copied ? "Copied" : "Copy link"}
          </Button>
        </Card>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
        {invites.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No invites yet.</p>
        ) : (
          invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-medium">{invite.status}</p>
                <p className="text-zinc-500">
                  Created {formatDate(invite.createdAt)} - expires {formatDate(invite.expiresAt)}
                </p>
              </div>
              {invite.status === "ACTIVE" && (
                <Button variant="danger" onClick={() => revoke(invite.id)}>
                  Revoke
                </Button>
              )}
            </div>
          ))
        )}
      </Card>
    </section>
  );
}

function HouseholdPage() {
  const { me, error, loading } = useMe();

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;
  if (error || !me) return <ErrorText>{error ?? "Could not load your household."}</ErrorText>;
  if (!me.household) {
    return <p className="text-sm text-zinc-500">You are not part of a household yet. Go to the home page to join one.</p>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{me.household.name}</h1>
        <p className="text-sm text-zinc-500">Everyone in the household has the same access.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Members</h2>
        <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
          {me.household.members.map((member) => (
            <div key={member.userId} className="flex items-center justify-between p-3 text-sm">
              <span>
                {member.displayName ?? member.email}
                {member.userId === me.userId && <span className="ml-2 text-zinc-500">(you)</span>}
              </span>
              <span className="text-zinc-500">Joined {formatDate(member.joinedAt)}</span>
            </div>
          ))}
        </Card>
      </section>

      <Invites />
    </div>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <AppShell>
        <HouseholdPage />
      </AppShell>
    </AuthGate>
  );
}
