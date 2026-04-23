# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Remix Social -- Social network feed with post composition, like reactions via useFetcher, user profiles with follow/unfollow, and full ErrorBoundary coverage. Backed by Supabase (PostgreSQL with RLS) for persistent data and Supabase Auth for authentication.

Built with Remix, React 18, TypeScript 5.9, Tailwind CSS, and Supabase.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npx tsc --noEmit         # Type check
npm run lint             # ESLint
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright E2E tests

# Database
npx supabase start       # Start local Supabase
npx supabase db reset    # Reset DB and apply migrations + seed
```

## Architecture

- `app/routes/` -- File-based routing with loaders and actions
  - `app/routes/_index.tsx` -- Feed page (post list, compose, like)
  - `app/routes/users.$username.tsx` -- User profile with posts and follow
  - `app/routes/auth.login.tsx` -- Login page
  - `app/routes/auth.signup.tsx` -- Signup page
  - `app/routes/auth.logout.tsx` -- Logout action
  - `app/routes/auth.callback.tsx` -- OAuth callback handler
- `app/lib/supabase.server.ts` -- Supabase server client, `requireUser()`, `getOptionalUser()`
- `app/lib/models.server.ts` -- Data access functions (getFeed, createPost, toggleLike, getUser, toggleFollow)
- `app/styles/global.css` -- Global styles
- `supabase/migrations/` -- Database migrations
- `supabase/seed.sql` -- Seed data (3 users, 5 posts, 8 comments, likes, follows)
- `public/` -- Static assets

## Database Schema

Five tables: `profiles`, `posts`, `comments`, `likes`, `follows`. RLS enabled on all tables. Posts and profiles are publicly readable; mutations restricted to the owning user. Auto-create profile trigger on user signup.

## Key Patterns

- **Auth flow:** Supabase Auth with email/password. `requireUser()` throws 401 for protected actions. `getOptionalUser()` returns null for anonymous visitors (feed is public).
- **Optimistic UI:** Like button uses useFetcher for instant feedback without full page reload.
- **Progressive enhancement:** All forms work without JavaScript via standard HTML form submissions.
- **Cookie-based sessions:** `@supabase/ssr` manages auth tokens in HTTP-only cookies via request/response headers.

## Seed Users (for local development)

| Email | Password | Username |
|---|---|---|
| alice@example.com | password123 | alice_dev |
| bob@example.com | password123 | bob_builds |
| carol@example.com | password123 | carol_ux |

## Rules

- Use `loader` for GET data, `action` for mutations -- no client-side fetching
- TypeScript strict mode -- no `any` types
- Progressive enhancement -- forms should work without JavaScript
- Tailwind utility classes for styling
- All Supabase queries go through `app/lib/models.server.ts`
- Auth checks: `requireUser()` for mutations, `getOptionalUser()` for public pages
- Always pass `headers` from Supabase client back in loader/action responses
