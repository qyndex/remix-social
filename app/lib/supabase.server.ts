import { createClient } from "@supabase/supabase-js";
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

/**
 * Admin client for server-side operations that bypass RLS (seed, triggers, etc.).
 * Use sparingly — prefer the per-request client for user-scoped queries.
 */
export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey);

/**
 * Creates a Supabase client scoped to the current request's auth session.
 * Reads/writes cookies via the request/response headers so the session
 * persists across page navigations.
 */
export function createSupabaseServerClient(request: Request) {
  const headers = new Headers();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, options),
          );
        });
      },
    },
  });

  return { supabase, headers };
}

/**
 * Require an authenticated user. Throws a 401 Response if not logged in.
 * Returns the user object and a headers object that must be merged into the
 * loader/action response so session cookies are refreshed.
 */
export async function requireUser(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Response("Unauthorized", { status: 401, headers });
  }

  return { user, supabase, headers };
}

/**
 * Get the current user if logged in, or null. Does NOT throw.
 */
export async function getOptionalUser(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user: user ?? null, supabase, headers };
}
