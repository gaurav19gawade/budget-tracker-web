"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, ErrorText } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";
import type { BudgetSummaryEntry } from "@/lib/types";

export default function BudgetsPage() {
  return (
    <AuthGate>
      <AppShell>
        <BudgetsContent />
      </AppShell>
    </AuthGate>
  );
}

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
  const d = new Date(y, m - 2, 1);
  return toYearMonth(d);
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return toYearMonth(d);
}

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function BudgetsContent() {
  const [month, setMonth] = useState(() => toYearMonth(new Date()));
  const [summary, setSummary] = useState<BudgetSummaryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyBusy, setCopyBusy] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  async function load(m: string) {
    setLoading(true);
    setError(null);
    setCopyMsg(null);
    try {
      const data = await apiFetch<BudgetSummaryEntry[]>(`/api/budgets?month=${m}`);
      setSummary(data);
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

  async function onCopy() {
    setCopyBusy(true);
    setCopyMsg(null);
    setError(null);
    try {
      const result = await apiFetch<{ copied: number }>(`/api/budgets/copy-previous?month=${month}`, {
        method: "POST",
      });
      setCopyMsg(`Copied ${result.copied} budget${result.copied !== 1 ? "s" : ""} from previous month.`);
      await load(month);
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Failed to copy.");
    } finally {
      setCopyBusy(false);
    }
  }

  // Separate totals row from category rows
  const totalsRow = summary?.find((e) => e.categoryId === null);
  const categoryRows = summary?.filter((e) => e.categoryId !== null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <Button variant="secondary" onClick={onCopy} disabled={copyBusy}>
          {copyBusy ? "Copying…" : "Copy previous month"}
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => navigate(prevMonth(month))}>‹</Button>
        <span className="min-w-40 text-center text-sm font-medium">{formatMonth(month)}</span>
        <Button variant="secondary" onClick={() => navigate(nextMonth(month))}>›</Button>
      </div>

      {copyMsg && <p className="text-sm text-zinc-500">{copyMsg}</p>}
      {error && <ErrorText>{error}</ErrorText>}
      {loading && <p className="text-sm text-zinc-500">Loading…</p>}

      {!loading && summary !== null && categoryRows.length === 0 && !totalsRow && (
        <Card>
          <p className="text-sm text-zinc-500">
            No budgets or transactions for this month. Set a budget for a category to get started.
          </p>
        </Card>
      )}

      {categoryRows.length > 0 && (
        <div className="space-y-2">
          {categoryRows.map((entry) => (
            <BudgetRow key={entry.categoryId!} entry={entry} month={month} onSave={() => load(month)} />
          ))}
        </div>
      )}

      {totalsRow && categoryRows.length > 0 && (
        <TotalsRow entry={totalsRow} />
      )}
    </div>
  );
}

function BudgetRow({
  entry,
  month,
  onSave,
}: {
  entry: BudgetSummaryEntry;
  month: string;
  onSave: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(entry.budgeted > 0 ? String(entry.budgeted) : "");
  const [busy, setBusy] = useState(false);

  const pct = entry.budgeted > 0 ? Math.min((entry.spent / entry.budgeted) * 100, 100) : 0;
  const isOver = entry.available < 0;

  const barColor =
    pct >= 100 ? "bg-red-500" :
    pct >= 80  ? "bg-yellow-400" :
                 "bg-green-500";

  async function saveBudget() {
    const amount = parseFloat(inputVal);
    if (isNaN(amount) || amount < 0) return;
    setBusy(true);
    try {
      await apiFetch(`/api/budgets/${entry.categoryId}?month=${month}`, {
        method: "PUT",
        body: JSON.stringify({ amount }),
      });
      setEditing(false);
      onSave();
    } catch {
      // ignore — parent will reload
    } finally {
      setBusy(false);
    }
  }

  async function removeBudget() {
    setBusy(true);
    try {
      await apiFetch(`/api/budgets/${entry.categoryId}?month=${month}`, { method: "DELETE" });
      setEditing(false);
      onSave();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            {entry.categoryColor && (
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
                style={{ backgroundColor: entry.categoryColor }}
              >
                {entry.categoryIcon ?? ""}
              </span>
            )}
            <span className="truncate text-sm font-medium">{entry.categoryName}</span>
            {entry.income > 0 && (
              <span className="text-xs text-green-600 dark:text-green-400">
                +{fmt.format(entry.income)} income
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {!editing ? (
              <>
                <span className="text-xs text-zinc-400">
                  {fmt.format(entry.spent)} / {entry.budgeted > 0 ? fmt.format(entry.budgeted) : "—"}
                </span>
                {isOver && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                    Over by {fmt.format(-entry.available)}
                  </span>
                )}
                <Button variant="secondary" onClick={() => { setInputVal(entry.budgeted > 0 ? String(entry.budgeted) : ""); setEditing(true); }}>
                  {entry.budgeted > 0 ? "Edit" : "Set budget"}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="h-8 w-24 rounded-md border border-zinc-300 bg-transparent px-2 text-sm dark:border-zinc-700"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveBudget()}
                  autoFocus
                  disabled={busy}
                />
                <Button onClick={saveBudget} disabled={busy || !inputVal}>Save</Button>
                {entry.budgeted > 0 && (
                  <Button variant="secondary" onClick={removeBudget} disabled={busy}>Remove</Button>
                )}
                <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
              </div>
            )}
          </div>
        </div>

        {entry.budgeted > 0 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function TotalsRow({ entry }: { entry: BudgetSummaryEntry }) {
  const isOver = entry.available < 0;
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <span className="text-sm font-semibold">Total</span>
      <div className="flex items-center gap-4 text-sm">
        {entry.income > 0 && (
          <span className="text-green-600 dark:text-green-400">+{fmt.format(entry.income)}</span>
        )}
        <span className="text-zinc-500">Spent {fmt.format(entry.spent)}</span>
        {entry.budgeted > 0 && (
          <span className={`font-medium ${isOver ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}>
            {isOver ? `Over by ${fmt.format(-entry.available)}` : `${fmt.format(entry.available)} left`}
          </span>
        )}
      </div>
    </div>
  );
}
