// NEXT_PUBLIC_* values are inlined at build time and are visible in the browser.
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "");
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
/**
 * Sign-in is on when Supabase is configured. With no Supabase variables (local development
 * against the API's "local" profile) the app skips sign-in and calls the API without a token.
 */
export const AUTH_ENABLED = SUPABASE_URL !== "" && SUPABASE_PUBLISHABLE_KEY !== "";
