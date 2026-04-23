import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createSupabaseServerClient } from "~/lib/supabase.server";

/**
 * OAuth/magic-link callback handler.
 * Exchanges the auth code for a session and redirects to home.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const { supabase, headers } = createSupabaseServerClient(request);
    await supabase.auth.exchangeCodeForSession(code);
    return redirect("/", { headers });
  }

  return redirect("/auth/login");
}
