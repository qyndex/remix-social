import type { MetaFunction, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, Form, Link, isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { createSupabaseServerClient, getOptionalUser } from "~/lib/supabase.server";

export const meta: MetaFunction = () => [{ title: "Log In — Remix Social" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await getOptionalUser(request);
  if (user) return redirect("/");
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return json({ error: "Email and password are required." }, { status: 400 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return json({ error: error.message }, { status: 400 });
  }

  return redirect("/", { headers });
}

export default function Login() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Log In</h1>
        <p className="auth-subtitle">Welcome back to Remix Social</p>

        {actionData?.error && (
          <div className="auth-error" role="alert">
            {actionData.error}
          </div>
        )}

        <Form method="post" className="auth-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            aria-label="Email address"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Your password"
            aria-label="Password"
          />

          <button type="submit" className="btn-post" aria-label="Log in">
            Log In
          </button>
        </Form>

        <p className="auth-footer">
          Don&apos;t have an account?{" "}
          <Link to="/auth/signup" className="auth-link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return <div className="error-box"><h2>{error.status}: {error.statusText}</h2></div>;
  }
  return <div className="error-box"><h2>Unexpected error</h2></div>;
}
