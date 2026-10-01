"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, ErrorText } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";

function JoinContent() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/invites/redeem", { method: "POST", body: JSON.stringify({ token }) });
      router.replace("/");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError("You already belong to a household, so you cannot join another one.");
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (token === "") {
    return <ErrorText>This invite link is missing its code. Ask for a new link.</ErrorText>;
  }

  return (
    <Card className="mx-auto max-w-md space-y-3">
      <h1 className="text-xl font-semibold tracking-tight">You have been invited</h1>
      <p className="text-sm text-zinc-500">Join the household to share accounts and budgets.</p>
      <Button onClick={join} disabled={busy}>
        {busy ? "Joining..." : "Join household"}
      </Button>
      {error && <ErrorText>{error}</ErrorText>}
    </Card>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-zinc-500">Loading...</p>}>
      <AuthGate>
        <AppShell>
          <JoinContent />
        </AppShell>
      </AuthGate>
    </Suspense>
  );
}
