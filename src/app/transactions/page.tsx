"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, ErrorText } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";
import type { Category, Transaction, SyncResult } from "@/lib/types";

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);

  async function loadTransactions() {
    setLoading(true);
    setError(null);
    try {
      const [data, cats] = await Promise.all([
        apiFetch<Transaction[]>("/api/transactions"),
        apiFetch<Category[]>("/api/categories"),
      ]);
      setTransactions(data);
      setCategories(cats);
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
            <TransactionRow
              key={tx.id}
              tx={tx}
              categories={categories}
              onCategoryChange={loadTransactions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionRow({
  tx,
  categories,
  onCategoryChange,
}: {
  tx: Transaction;
  categories: Category[];
  onCategoryChange: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [catBusy, setCatBusy] = useState(false);

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

  const currentCat = categories.find((c) => c.id === tx.categoryId);

  async function setCategory(newCategoryId: string | null) {
    setCatBusy(true);
    try {
      await apiFetch(`/api/transactions/${tx.id}/category`, {
        method: "PATCH",
        body: JSON.stringify({ categoryId: newCategoryId }),
      });
      onCategoryChange();
    } catch {
      // silently ignore — parent reload will reflect actual state
    } finally {
      setCatBusy(false);
      setPicking(false);
    }
  }

  return (
    <div className="rounded-md px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-20 shrink-0 text-xs text-zinc-400">{date ?? "Pending"}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{label}</p>
            {tx.description && tx.payee && tx.description !== tx.payee && (
              <p className="truncate text-xs text-zinc-400">{tx.description}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => setPicking((v) => !v)}
            disabled={catBusy}
            title="Set category"
          >
            {currentCat ? (
              <>
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
                  style={{ backgroundColor: currentCat.color ?? "#9CA3AF" }}
                >
                  {currentCat.icon ?? ""}
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">{currentCat.name}</span>
              </>
            ) : (
              <span className="text-zinc-400">Uncategorized</span>
            )}
            {tx.categoryOverride && (
              <span className="ml-0.5 text-zinc-300" title="Manual override">✋</span>
            )}
          </button>
          <div className="text-right">
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
      </div>

      {picking && (
        <div className="mt-2 ml-23 flex flex-wrap gap-1.5 pl-23">
          <button
            className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            onClick={() => setCategory(null)}
            disabled={catBusy}
          >
            None
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`flex items-center gap-1 rounded border px-2 py-1 text-xs hover:opacity-90 ${
                cat.id === tx.categoryId
                  ? "border-transparent font-medium text-white"
                  : "border-zinc-200 dark:border-zinc-700"
              }`}
              style={cat.id === tx.categoryId ? { backgroundColor: cat.color ?? "#9CA3AF" } : {}}
              onClick={() => setCategory(cat.id)}
              disabled={catBusy}
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
