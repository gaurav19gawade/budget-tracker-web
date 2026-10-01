import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AUTH_ENABLED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/config";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!AUTH_ENABLED) {
    throw new Error("Sign-in is disabled: Supabase is not configured (local mode).");
  }
  if (client === null) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
  return client;
}
