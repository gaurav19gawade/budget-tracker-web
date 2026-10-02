"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, ErrorText } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";
import type { Account, SyncResult } from "@/lib/types";

export default function AccountsPage() {
  return (
    <AuthGate>
      <AppShell>
        <AccountsContent />
      </AppShell>
    </AuthGate>
  );
}

function AccountsContent() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [setupToken, setSetupToken] = useState("");
  const [connectBusy, setConnectBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);

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

  async function onConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!setupToken.trim()) return;
    setConnectBusy(true);
    setError(null);
    try {
      await apiFetch("/api/simplefin/connections", {
        method: "POST",
        body: JSON.stringify({ setupToken: setupToken.trim() }),
      });
      setSetupToken("");
      setShowConnect(false);
      await loadAccounts();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Failed to connect account.");
    } finally {
      setConnectBusy(false);
    }
  }

  async function onSync() {
    setSyncBusy(true);
    setError(null);
    try {
      const result = await apiFetch<SyncResult>("/api/sync", { method: "POST" });
      setLastSync(result);
      await loadAccounts();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncBusy(false);
    }
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

  const hasAccounts = accounts != null && accounts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Bank Accounts</h1>
        <div className="flex items-center gap-2">
          {hasAccounts && (
            <Button variant="secondary" onClick={onSync} disabled={syncBusy}>
              {syncBusy ? "Syncing…" : "Sync now"}
            </Button>
          )}
          <Button onClick={() => { setShowConnect((v) => !v); setError(null); }}>
            {showConnect ? "Cancel" : "Connect account"}
          </Button>
        </div>
      </div>

      {lastSync && (
        <p className="text-sm text-zinc-500">
          Last sync: {lastSync.newTransactions} new, {lastSync.updatedTransactions} updated transaction
          {lastSync.newTransactions + lastSync.updatedTransactions !== 1 ? "s" : ""} —{" "}
          {new Date(lastSync.syncedAt).toLocaleTimeString()}
        </p>
      )}

      {showConnect && (
        <Card>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Step 1</p>
              <p className="text-sm text-zinc-500">
                Visit{" "}
                <a
                  href="https://beta-bridge.simplefin.org/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  beta-bridge.simplefin.org/create
                </a>
                , connect your bank, and copy the setup token.
              </p>
            </div>
            <form onSubmit={onConnect} className="space-y-3">
              <div>
                <p className="mb-1 text-sm font-medium">Step 2 — Paste your setup token</p>
                <textarea
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-900"
                  rows={3}
                  placeholder="Paste token here…"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  disabled={connectBusy}
                />
              </div>
              <Button type="submit" disabled={connectBusy || !setupToken.trim()}>
                {connectBusy ? "Connecting…" : "Connect"}
              </Button>
            </form>
          </div>
        </Card>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}

      {!loading && accounts !== null && accounts.length === 0 && !showConnect && (
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

  const syncedLabel = account.lastSyncedAt
    ? new Date(account.lastSyncedAt).toLocaleString()
    : null;

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
          {syncedLabel && (
            <p className="text-xs text-zinc-400">Synced {syncedLabel}</p>
          )}
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
