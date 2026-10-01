import { API_BASE_URL, AUTH_ENABLED } from "@/lib/config";
import { getSupabase } from "@/lib/supabase";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function accessToken(): Promise<string | null> {
  if (!AUTH_ENABLED) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "NETWORK", "Could not reach the server. Is the API running?");
  }

  if (!response.ok) {
    let detail = "";
    let code: string | undefined;
    try {
      const problem = await response.json();
      detail = typeof problem.detail === "string" ? problem.detail : "";
      code = typeof problem.code === "string" ? problem.code : undefined;
    } catch {
      // The body was not JSON; fall back to the generic message below.
    }
    throw new ApiError(response.status, code, detail || `Request failed (${response.status}).`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
