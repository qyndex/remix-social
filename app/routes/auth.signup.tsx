import type { MetaFunction, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, Form, Link, isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { createSupabaseServerClient, getOptionalUser } from "~/lib/supabase.server";

export const meta: MetaFunction = () => [{ title: "Sign Up — Remix Social" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await getOptionalUser(request);
  if (user) return redirect("/");
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const username = (formData.get("username") as string)?.trim();
  const fullName = (formData.get("fullName") as string)?.trim();

  if (!email || !password || !username) {
    return json({ error: "Email, username, and password are required." }, { status: 400 });
  }

  if (username.length < 3 || username.length > 30) {
    return json({ error: "Username must be 3-30 characters." }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return json({ error: "Username can only contain letters, numbers, and underscores." }, { status: 400 });
  }

  if (password.length < 6) {
    return json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, full_name: fullName ?? username },
    },
  });

  if (error) {
    return json({ error: error.message }, { status: 400 });
  }

  return redirect("/", { headers });
}

export default function Signup() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign Up</h1>
        <p className="auth-subtitle">Join Remix Social</p>

        {actionData?.error && (
          <div className="auth-error" role="alert">
            {actionData.error}
          </div>
        )}

        <Form method="post" className="auth-form">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            placeholder="your_username"
            pattern="[a-zA-Z0-9_]+"
            minLength={3}
            maxLength={30}
            aria-label="Username"
          />

          <label htmlFor="fullName">Display Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Your Name"
            aria-label="Display name"
          />

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
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            aria-label="Password"
          />

          <button type="submit" className="btn-post" aria-label="Sign up">
            Sign Up
          </button>
        </Form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/auth/login" className="auth-link">
            Log in
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
