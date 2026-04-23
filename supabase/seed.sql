-- Seed data: 3 users with profiles, 5 posts, 8 comments, some likes and follows
-- Uses fixed UUIDs so references are deterministic

-- Create auth users (Supabase local dev seeds into auth.users directly)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
VALUES
  (
    'a1a1a1a1-0001-4000-8000-000000000001',
    'alice@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"username": "alice_dev", "full_name": "Alice Chen"}'::jsonb,
    NOW(), NOW(),
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
  ),
  (
    'a1a1a1a1-0002-4000-8000-000000000002',
    'bob@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"username": "bob_builds", "full_name": "Bob Smith"}'::jsonb,
    NOW(), NOW(),
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
  ),
  (
    'a1a1a1a1-0003-4000-8000-000000000003',
    'carol@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"username": "carol_ux", "full_name": "Carol White"}'::jsonb,
    NOW(), NOW(),
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Profiles are auto-created by the trigger, but update bio and avatar
UPDATE profiles SET
  bio = 'Full-stack dev. Building cool things with TypeScript.',
  avatar_url = 'https://api.dicebear.com/9.x/initials/svg?seed=AC'
WHERE id = 'a1a1a1a1-0001-4000-8000-000000000001';

UPDATE profiles SET
  bio = 'Open source advocate. Remix fan.',
  avatar_url = 'https://api.dicebear.com/9.x/initials/svg?seed=BS'
WHERE id = 'a1a1a1a1-0002-4000-8000-000000000002';

UPDATE profiles SET
  bio = 'UX designer. Making the web more accessible.',
  avatar_url = 'https://api.dicebear.com/9.x/initials/svg?seed=CW'
WHERE id = 'a1a1a1a1-0003-4000-8000-000000000003';

-- Posts (5 posts across users)
INSERT INTO posts (id, author_id, content, created_at) VALUES
  (
    'b1b1b1b1-0001-4000-8000-000000000001',
    'a1a1a1a1-0001-4000-8000-000000000001',
    'Just shipped a new feature using Remix 2 loaders. The progressive enhancement story is unreal!',
    '2026-03-21T12:00:00Z'
  ),
  (
    'b1b1b1b1-0002-4000-8000-000000000002',
    'a1a1a1a1-0003-4000-8000-000000000003',
    'Accessibility tip: always test with a keyboard before shipping. Tab order matters more than you think.',
    '2026-03-21T10:30:00Z'
  ),
  (
    'b1b1b1b1-0003-4000-8000-000000000003',
    'a1a1a1a1-0002-4000-8000-000000000002',
    'Hot take: co-locating your data fetching with your components (via loaders) is the best DX improvement in years.',
    '2026-03-21T08:00:00Z'
  ),
  (
    'b1b1b1b1-0004-4000-8000-000000000004',
    'a1a1a1a1-0001-4000-8000-000000000001',
    'TIL you can stream data in Remix with defer(). Game changer for slow API calls.',
    '2026-03-20T18:00:00Z'
  ),
  (
    'b1b1b1b1-0005-4000-8000-000000000005',
    'a1a1a1a1-0002-4000-8000-000000000002',
    'Just open-sourced my Remix starter template. Link in bio!',
    '2026-03-20T14:00:00Z'
  )
ON CONFLICT (id) DO NOTHING;

-- Comments (8 comments across posts)
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES
  ('c1c1c1c1-0001-4000-8000-000000000001', 'b1b1b1b1-0001-4000-8000-000000000001', 'a1a1a1a1-0002-4000-8000-000000000002', 'Nice! What loader pattern did you use?', '2026-03-21T12:30:00Z'),
  ('c1c1c1c1-0002-4000-8000-000000000002', 'b1b1b1b1-0001-4000-8000-000000000001', 'a1a1a1a1-0003-4000-8000-000000000003', 'Love the progressive enhancement approach!', '2026-03-21T13:00:00Z'),
  ('c1c1c1c1-0003-4000-8000-000000000003', 'b1b1b1b1-0002-4000-8000-000000000002', 'a1a1a1a1-0001-4000-8000-000000000001', 'So true! I always check tab order first.', '2026-03-21T11:00:00Z'),
  ('c1c1c1c1-0004-4000-8000-000000000004', 'b1b1b1b1-0002-4000-8000-000000000002', 'a1a1a1a1-0002-4000-8000-000000000002', 'This should be in every dev onboarding checklist.', '2026-03-21T11:30:00Z'),
  ('c1c1c1c1-0005-4000-8000-000000000005', 'b1b1b1b1-0003-4000-8000-000000000003', 'a1a1a1a1-0001-4000-8000-000000000001', 'Agreed! Server-side data fetching FTW.', '2026-03-21T09:00:00Z'),
  ('c1c1c1c1-0006-4000-8000-000000000006', 'b1b1b1b1-0003-4000-8000-000000000003', 'a1a1a1a1-0003-4000-8000-000000000003', 'Remix loaders changed how I think about data flow.', '2026-03-21T09:30:00Z'),
  ('c1c1c1c1-0007-4000-8000-000000000007', 'b1b1b1b1-0004-4000-8000-000000000004', 'a1a1a1a1-0002-4000-8000-000000000002', 'Streaming + Suspense = magic combo.', '2026-03-20T19:00:00Z'),
  ('c1c1c1c1-0008-4000-8000-000000000008', 'b1b1b1b1-0005-4000-8000-000000000005', 'a1a1a1a1-0003-4000-8000-000000000003', 'Will check it out! Share the repo?', '2026-03-20T15:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Likes
INSERT INTO likes (post_id, user_id) VALUES
  ('b1b1b1b1-0001-4000-8000-000000000001', 'a1a1a1a1-0002-4000-8000-000000000002'),
  ('b1b1b1b1-0001-4000-8000-000000000001', 'a1a1a1a1-0003-4000-8000-000000000003'),
  ('b1b1b1b1-0002-4000-8000-000000000002', 'a1a1a1a1-0001-4000-8000-000000000001'),
  ('b1b1b1b1-0002-4000-8000-000000000002', 'a1a1a1a1-0002-4000-8000-000000000002'),
  ('b1b1b1b1-0002-4000-8000-000000000002', 'a1a1a1a1-0003-4000-8000-000000000003'),
  ('b1b1b1b1-0003-4000-8000-000000000003', 'a1a1a1a1-0001-4000-8000-000000000001'),
  ('b1b1b1b1-0003-4000-8000-000000000003', 'a1a1a1a1-0003-4000-8000-000000000003'),
  ('b1b1b1b1-0004-4000-8000-000000000004', 'a1a1a1a1-0002-4000-8000-000000000002'),
  ('b1b1b1b1-0005-4000-8000-000000000005', 'a1a1a1a1-0001-4000-8000-000000000001'),
  ('b1b1b1b1-0005-4000-8000-000000000005', 'a1a1a1a1-0003-4000-8000-000000000003')
ON CONFLICT (post_id, user_id) DO NOTHING;

-- Follows
INSERT INTO follows (follower_id, following_id) VALUES
  ('a1a1a1a1-0001-4000-8000-000000000001', 'a1a1a1a1-0002-4000-8000-000000000002'),
  ('a1a1a1a1-0001-4000-8000-000000000001', 'a1a1a1a1-0003-4000-8000-000000000003'),
  ('a1a1a1a1-0002-4000-8000-000000000002', 'a1a1a1a1-0001-4000-8000-000000000001'),
  ('a1a1a1a1-0003-4000-8000-000000000003', 'a1a1a1a1-0001-4000-8000-000000000001'),
  ('a1a1a1a1-0003-4000-8000-000000000003', 'a1a1a1a1-0002-4000-8000-000000000002')
ON CONFLICT (follower_id, following_id) DO NOTHING;
