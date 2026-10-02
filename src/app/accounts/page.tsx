"use client";

import Script from "next/script";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, ErrorText } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";
import { TELLER_APPLICATION_ID, TELLER_ENV } from "@/lib/config";
import type { Account } from "@/lib/types";

// ---- Teller Connect types (CDN widget, no npm package) --------------------------

type TellerAuthorization = {
  enrollment: { id: string; institution: { name: string; id: string } };
  accessToken: string;
};

declare global {
  interface Window {
    TellerConnect: {
      setup(config: {
        applicationId: string;
        environment: string;
        onSuccess: (auth: TellerAuthorization) => void;
        onExit?: () => void;
      }): { open(): void };
    };
  }
}

// ---- Accounts page --------------------------------------------------------------

export default function AccountsPage() {
  return (
    <AuthGate>
      <AppShell>
        <Script src="https://cdn.teller.io/connect/connect.js" strategy="lazyOnload" />
        <AccountsContent />
      </AppShell>
    </AuthGate>
  );
}

function AccountsContent() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);

  async function loadAccounts() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Account[]>("/api/accounts");
      setAccounts(data);
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }

  // Load on mount
  useState(() => { loadAccounts(); });

  async function onTellerSuccess(auth: TellerAuthorization) {
    setConnectBusy(true);
    setError(null);
    try {
      await apiFetch("/api/teller/enrollments", {
        method: "POST",
        body: JSON.stringify({
          enrollmentId: auth.enrollment.id,
          accessToken: auth.accessToken,
        }),
      });
      await loadAccounts();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Failed to connect account.");
    } finally {
      setConnectBusy(false);
    }
  }

  function openTellerConnect() {
    if (!window.TellerConnect || !TELLER_APPLICATION_ID) return;
    const connect = window.TellerConnect.setup({
      applicationId: TELLER_APPLICATION_ID,
      environment: TELLER_ENV,
      onSuccess: onTellerSuccess,
    });
    connect.open();
  }

  async function removeAccount(id: string) {
    setError(null);
    try {
      await apiFetch(`/api/accounts/${id}`, { method: "DELETE" });
      await loadAccounts();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Failed to remove account.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Bank Accounts</h1>
        <Button
          disabled={connectBusy || !TELLER_APPLICATION_ID}
          onClick={openTellerConnect}
          title={!TELLER_APPLICATION_ID ? "Teller not configured" : undefined}
        >
          {connectBusy ? "Connecting…" : "Connect account"}
        </Button>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}

      {!loading && accounts !== null && accounts.length === 0 && (
        <Card>
          <p className="text-sm text-zinc-500">
            No accounts connected yet. Click <strong>Connect account</strong> to link your bank.
          </p>
        </Card>
      )}

      {accounts && accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((account) => (
            <AccountRow key={account.id} account={account} onRemove={removeAccount} />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountRow({
  account,
  onRemove,
}: {
  account: Account;
  onRemove: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const balance =
    account.balanceAvailable != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: account.currency }).format(
          account.balanceAvailable,
        )
      : "—";

  const subtitle = [account.type, account.subtype].filter(Boolean).join(" · ");

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">
            {account.institution}
            {account.lastFour && (
              <span className="ml-1 font-normal text-zinc-500">···· {account.lastFour}</span>
            )}
          </p>
          <p className="text-sm text-zinc-500">{account.name}</p>
          {subtitle && <p className="text-xs capitalize text-zinc-400">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-medium tabular-nums">{balance}</span>
          {confirming ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setConfirming(false);
                  onRemove(account.id);
                }}
              >
                Confirm remove
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
