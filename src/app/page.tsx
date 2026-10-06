"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, ErrorText, inputClass } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";
import type { BudgetSummaryEntry, Me, Transaction } from "@/lib/types";
import { useMe } from "@/lib/useMe";

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

// ---- helpers ----------------------------------------------------------------

function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return toYearMonth(new Date(y, m - 2, 1));
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return toYearMonth(new Date(y, m, 1));
}

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// ---- Dashboard --------------------------------------------------------------

function Dashboard({ me }: { me: Me }) {
  const [month, setMonth] = useState(() => toYearMonth(new Date()));
  const [summary, setSummary] = useState<BudgetSummaryEntry[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(m: string) {
    setLoading(true);
    setError(null);
    try {
      const [y, mo] = m.split("-").map(Number);
      const from = `${m}-01`;
      const lastDay = new Date(y, mo, 0).getDate();
      const to = `${m}-${String(lastDay).padStart(2, "0")}`;
      const [s, t] = await Promise.all([
        apiFetch<BudgetSummaryEntry[]>(`/api/budgets?month=${m}`),
        apiFetch<Transaction[]>(`/api/transactions?from=${from}&to=${to}`),
      ]);
      setSummary(s);
      setTransactions(t);
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useState(() => { load(month); });

  function navigate(m: string) {
    setMonth(m);
    load(m);
  }

  const totals = summary?.find((e) => e.categoryId === null);
  const categoryRows = (summary ?? [])
    .filter((e) => e.categoryId !== null && (e.spent > 0 || e.income > 0))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 6);

  const topExpenses = (transactions ?? [])
    .filter((t) => !t.isInternalTransfer && t.amount < 0 && !t.pending)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5);

  const categoryNameById = Object.fromEntries(
    (summary ?? []).filter((e) => e.categoryId !== null).map((e) => [e.categoryId!, e.categoryName])
  );

  const net = totals ? totals.income - totals.spent : 0;
  const hasData = totals && (totals.income > 0 || totals.spent > 0);

  return (
    <div className="space-y-8">
      {/* Header + month nav */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{me.household?.name ?? "Dashboard"}</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate(prevMonth(month))}>‹</Button>
          <span className="min-w-36 text-center text-sm font-medium">{formatMonth(month)}</span>
          <Button variant="secondary" onClick={() => navigate(nextMonth(month))}>›</Button>
        </div>
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {loading && <p className="text-sm text-zinc-500">Loading…</p>}

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Monthly summary">
        <SummaryCard
          label="Money in"
          value={totals ? fmt.format(totals.income) : "—"}
          color="text-green-600 dark:text-green-400"
        />
        <SummaryCard
          label="Money out"
          value={totals ? fmt.format(totals.spent) : "—"}
          color="text-red-600 dark:text-red-400"
        />
        <SummaryCard
          label="Net"
          value={totals ? fmt.format(net) : "—"}
          color={net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
        />
        <SummaryCard
          label="Budget remaining"
          value={totals && totals.budgeted > 0 ? fmt.format(totals.available) : "—"}
          color={
            !totals || totals.budgeted === 0 ? undefined :
            totals.available >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spend by category */}
        <section aria-label="Spend by category">
          <h2 className="mb-3 text-base font-medium">Spend by category</h2>
          {!hasData && !loading ? (
            <Card>
              <p className="text-sm text-zinc-500">No spending data for this month.</p>
            </Card>
          ) : (
            <Card>
              <div className="space-y-3">
                {categoryRows.length === 0 && !loading && (
                  <p className="text-sm text-zinc-500">No categorized spending yet.</p>
                )}
                {categoryRows.map((entry) => {
                  const pct = totals && totals.spent > 0
                    ? Math.min((entry.spent / totals.spent) * 100, 100)
                    : 0;
                  return (
                    <div key={entry.categoryId}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {entry.categoryColor && (
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs"
                              style={{ backgroundColor: entry.categoryColor }}
                            >
                              {entry.categoryIcon ?? ""}
                            </span>
                          )}
                          <span className="truncate text-sm">{entry.categoryName}</span>
                        </div>
                        <span className="shrink-0 text-sm font-medium">{fmt.format(entry.spent)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </section>

        {/* Top expenses */}
        <section aria-label="Top expenses">
          <h2 className="mb-3 text-base font-medium">Top expenses</h2>
          {!hasData && !loading ? (
            <Card>
              <p className="text-sm text-zinc-500">No expenses for this month yet.</p>
            </Card>
          ) : topExpenses.length === 0 && !loading ? (
            <Card>
              <p className="text-sm text-zinc-500">No expenses found. Connect an account and sync to get started.</p>
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {topExpenses.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{tx.payee ?? tx.description ?? "Unknown"}</p>
                      <p className="truncate text-xs text-zinc-400">
                        {tx.postedDate}{tx.categoryId ? ` · ${categoryNameById[tx.categoryId] ?? ""}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-red-600 dark:text-red-400">
                      {fmt.format(Math.abs(tx.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color ?? ""}`}>{value}</p>
    </Card>
  );
}

// ---- Root -------------------------------------------------------------------

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
