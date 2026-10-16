"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, ErrorText, inputClass } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";
import type { Category, CategoryRule, MatchField, RuleSuggestion } from "@/lib/types";

export default function RulesPage() {
  return (
    <AuthGate>
      <AppShell>
        <RulesContent />
      </AppShell>
    </AuthGate>
  );
}

const MATCH_FIELD_LABELS: Record<MatchField, string> = {
  PAYEE_CONTAINS: "Payee contains",
  DESCRIPTION_CONTAINS: "Description contains",
  AMOUNT_GTE: "Amount ≥",
  AMOUNT_LTE: "Amount ≤",
  ACCOUNT_ID: "Account ID =",
};

function RulesContent() {
  const [rules, setRules] = useState<CategoryRule[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [applyResult, setApplyResult] = useState<{ categorized: number } | null>(null);

  // suggestions state
  const [suggestions, setSuggestions] = useState<RuleSuggestion[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // form state
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("0");
  const [matchField, setMatchField] = useState<MatchField>("PAYEE_CONTAINS");
  const [matchValue, setMatchValue] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [r, c] = await Promise.all([
        apiFetch<CategoryRule[]>("/api/category-rules"),
        apiFetch<Category[]>("/api/categories"),
      ]);
      setRules(r);
      setCategories(c);
      if (!categoryId && c.length > 0) setCategoryId(c[0].id);
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useState(() => { load(); });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !matchValue.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/category-rules", {
        method: "POST",
        body: JSON.stringify({
          categoryId,
          priority: parseInt(priority, 10),
          matchField,
          matchValue: matchValue.trim(),
        }),
      });
      setMatchValue(""); setPriority("0"); setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Failed to create.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setError(null);
    try {
      await apiFetch(`/api/category-rules/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  async function onApply() {
    setBusy(true);
    setError(null);
    setApplyResult(null);
    try {
      const result = await apiFetch<{ categorized: number }>("/api/category-rules/apply", { method: "POST" });
      setApplyResult(result);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Failed to apply.");
    } finally {
      setBusy(false);
    }
  }

  async function onSuggest() {
    setSuggestLoading(true);
    setSuggestError(null);
    setSuggestions(null);
    try {
      const result = await apiFetch<RuleSuggestion[]>("/api/category-rules/suggestions");
      setSuggestions(result);
    } catch (err) {
      setSuggestError(err instanceof ApiError || err instanceof Error ? err.message : "Failed to get suggestions.");
    } finally {
      setSuggestLoading(false);
    }
  }

  function onSuggestionCreated(payee: string) {
    setSuggestions((prev) => prev?.filter((s) => s.payee !== payee) ?? null);
    load();
  }

  const categoryMap = Object.fromEntries((categories ?? []).map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Category Rules</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onApply}
            disabled={busy || (rules !== null && rules.length === 0)}
            title={rules !== null && rules.length === 0 ? "No rules to apply" : undefined}
          >
            Apply rules
          </Button>
          <Button
            variant="secondary"
            onClick={onSuggest}
            disabled={suggestLoading}
          >
            {suggestLoading ? "Thinking…" : "Suggest rules"}
          </Button>
          <Button onClick={() => { setShowForm((v) => !v); setError(null); setApplyResult(null); }}>
            {showForm ? "Cancel" : "New rule"}
          </Button>
        </div>
      </div>

      {applyResult && (
        <p className="text-sm text-zinc-500">
          Applied rules — {applyResult.categorized} transaction(s) categorized.
        </p>
      )}

      {showForm && (
        <Card>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1 block text-sm font-medium">Category</label>
                <select
                  className={inputClass}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={busy}
                >
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Priority</label>
                <input
                  type="number"
                  className={inputClass}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={busy}
                  min="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Match</label>
                <select
                  className={inputClass}
                  value={matchField}
                  onChange={(e) => setMatchField(e.target.value as MatchField)}
                  disabled={busy}
                >
                  {(Object.keys(MATCH_FIELD_LABELS) as MatchField[]).map((f) => (
                    <option key={f} value={f}>{MATCH_FIELD_LABELS[f]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Value</label>
                <input
                  className={inputClass}
                  placeholder={matchField.startsWith("AMOUNT") ? "e.g. 100" : "e.g. Starbucks"}
                  value={matchValue}
                  onChange={(e) => setMatchValue(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
            <Button type="submit" disabled={busy || !categoryId || !matchValue.trim()}>
              {busy ? "Creating…" : "Create"}
            </Button>
          </form>
        </Card>
      )}

      {error && <ErrorText>{error}</ErrorText>}
      {loading && <p className="text-sm text-zinc-500">Loading…</p>}

      {/* Suggestions panel */}
      {suggestError && <ErrorText>{suggestError}</ErrorText>}
      {suggestions !== null && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Suggested rules</h2>
            <Button variant="secondary" onClick={() => setSuggestions(null)}>
              Dismiss all
            </Button>
          </div>
          {suggestions.length === 0 ? (
            <Card>
              <p className="text-sm text-zinc-500">
                No suggestions — all transactions are already categorized or covered by existing rules.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s) => (
                <SuggestionRow
                  key={s.payee}
                  suggestion={s}
                  categories={categories ?? []}
                  onCreated={() => onSuggestionCreated(s.payee)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {rules && rules.length === 0 && !loading && (
        <Card>
          <p className="text-sm text-zinc-500">No rules yet. Create a rule to auto-categorize transactions.</p>
        </Card>
      )}

      {rules && rules.length > 0 && (
        <div className="space-y-2">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              category={categoryMap[rule.categoryId]}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionRow({
  suggestion,
  categories,
  onCreated,
}: {
  suggestion: RuleSuggestion;
  categories: Category[];
  onCreated: () => void;
}) {
  const [categoryId, setCategoryId] = useState(suggestion.categoryId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function onCreate() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/category-rules", {
        method: "POST",
        body: JSON.stringify({
          categoryId,
          priority: 0,
          matchField: "PAYEE_CONTAINS",
          matchValue: suggestion.payee,
        }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Failed to create.");
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{suggestion.payee}</p>
          <p className="text-xs text-zinc-400">
            {suggestion.matchCount} uncategorized transaction{suggestion.matchCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            className={inputClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={busy}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ""}{c.name}
              </option>
            ))}
          </select>
          <Button onClick={onCreate} disabled={busy}>
            {busy ? "Creating…" : "Create rule"}
          </Button>
          <Button variant="secondary" onClick={() => setDismissed(true)} disabled={busy}>
            Dismiss
          </Button>
        </div>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </Card>
  );
}

function RuleRow({
  rule,
  category,
  onDelete,
}: {
  rule: CategoryRule;
  category: Category | undefined;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 shrink-0 text-center text-xs font-mono text-zinc-400">{rule.priority}</span>
          {category && (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs"
              style={{ backgroundColor: category.color ?? "#9CA3AF" }}
            >
              {category.icon ?? ""}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {category?.name ?? rule.categoryId}
            </p>
            <p className="text-xs text-zinc-400 truncate">
              {MATCH_FIELD_LABELS[rule.matchField]} &ldquo;{rule.matchValue}&rdquo;
            </p>
          </div>
        </div>
        {confirming ? (
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button onClick={() => { setConfirming(false); onDelete(rule.id); }}>
              Confirm delete
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setConfirming(true)}>Delete</Button>
        )}
      </div>
    </Card>
  );
}
