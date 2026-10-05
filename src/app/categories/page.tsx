"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, ErrorText } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  return (
    <AuthGate>
      <AppShell>
        <CategoriesContent />
      </AppShell>
    </AuthGate>
  );
}

function CategoriesContent() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [icon, setIcon] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setCategories(await apiFetch<Category[]>("/api/categories"));
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useState(() => { load(); });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), color, icon: icon.trim() || null }),
      });
      setName(""); setIcon(""); setShowForm(false);
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
      await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <Button onClick={() => { setShowForm((v) => !v); setError(null); }}>
          {showForm ? "Cancel" : "New category"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="e.g. Pets"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Color</label>
                <input
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded-md border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Icon</label>
                <input
                  className="w-16 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="🐾"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Creating…" : "Create"}
            </Button>
          </form>
        </Card>
      )}

      {error && <ErrorText>{error}</ErrorText>}
      {loading && <p className="text-sm text-zinc-500">Loading…</p>}

      {categories && categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((cat) => (
            <CategoryRow key={cat.id} category={cat} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  onDelete,
}: {
  category: Category;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
            style={{ backgroundColor: category.color ?? "#9CA3AF" }}
          >
            {category.icon ?? ""}
          </span>
          <div>
            <p className="font-medium">{category.name}</p>
            {category.isSystem && (
              <p className="text-xs text-zinc-400">Default</p>
            )}
          </div>
        </div>
        {!category.isSystem && (
          confirming ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)}>Cancel</Button>
              <Button onClick={() => { setConfirming(false); onDelete(category.id); }}>
                Confirm delete
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirming(true)}>Delete</Button>
          )
        )}
      </div>
    </Card>
  );
}
