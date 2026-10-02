"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, ErrorText } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";
import type { Transaction, SyncResult } from "@/lib/types";

export default function TransactionsPage() {
  return (
    <AuthGate>
      <AppShell>
        <TransactionsContent />
      </AppShell>
    </AuthGate>
  );
}

function TransactionsContent() {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);

  async function loadTransactions() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Transaction[]>("/api/transactions");
      setTransactions(data);
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }

  // Load on mount
  useState(() => { loadTransactions(); });

  async function onSync() {
    setSyncBusy(true);
    setError(null);
    try {
      const result = await apiFetch<SyncResult>("/api/sync", { method: "POST" });
      setLastSync(result);
      await loadTransactions();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <Button variant="secondary" onClick={onSync} disabled={syncBusy}>
          {syncBusy ? "Syncing…" : "Sync now"}
        </Button>
      </div>

      {lastSync && (
        <p className="text-sm text-zinc-500">
          Synced {lastSync.newTransactions} new, {lastSync.updatedTransactions} updated —{" "}
          {new Date(lastSync.syncedAt).toLocaleTimeString()}
        </p>
      )}

      {error && <ErrorText>{error}</ErrorText>}
      {loading && <p className="text-sm text-zinc-500">Loading…</p>}

      {!loading && transactions !== null && transactions.length === 0 && (
        <Card>
          <p className="text-sm text-zinc-500">
            No transactions in the last 30 days.{" "}
            <Link href="/accounts" className="underline hover:text-foreground">
              Connect an account
            </Link>{" "}
            and click <strong>Sync now</strong> to import transactions.
          </p>
        </Card>
      )}

      {transactions && transactions.length > 0 && (
        <div className="space-y-1">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const amountNum = Number(tx.amount);
  const isNegative = amountNum < 0;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: tx.currency,
  }).format(Math.abs(amountNum));

  const label = tx.payee || tx.description || "Unknown";
  const date = tx.postedDate
    ? new Date(tx.postedDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-md px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-20 shrink-0 text-xs text-zinc-400">{date ?? "Pending"}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{label}</p>
          {tx.description && tx.payee && tx.description !== tx.payee && (
            <p className="truncate text-xs text-zinc-400">{tx.description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span
          className={`text-sm font-medium tabular-nums ${
            isNegative ? "text-foreground" : "text-green-600 dark:text-green-400"
          }`}
        >
          {isNegative ? "−" : "+"}
          {formatted}
        </span>
        {tx.pending && (
          <p className="text-xs text-zinc-400">Pending</p>
        )}
      </div>
    </div>
  );
}
