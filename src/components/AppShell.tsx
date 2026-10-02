"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { AUTH_ENABLED } from "@/lib/config";
import { getSupabase } from "@/lib/supabase";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  async function signOut() {
    await getSupabase().auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/" className="font-semibold">
              Budget Tracker
            </Link>
            <Link href="/accounts" className="text-zinc-600 hover:text-foreground dark:text-zinc-400">
              Accounts
            </Link>
            <Link href="/transactions" className="text-zinc-600 hover:text-foreground dark:text-zinc-400">
              Transactions
            </Link>
            <Link href="/household" className="text-zinc-600 hover:text-foreground dark:text-zinc-400">
              Household
            </Link>
          </nav>
          {AUTH_ENABLED ? (
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          ) : (
            <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
              Local mode (no sign-in)
            </span>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
