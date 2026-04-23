import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Helper: build a mock Supabase client with chainable query builder
// ---------------------------------------------------------------------------

type MockQueryResult = { data: unknown; error: unknown; count?: number };

function createMockQueryBuilder(result: MockQueryResult) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    "select", "insert", "update", "delete", "eq", "neq",
    "order", "limit", "single", "maybeSingle",
  ];
  for (const m of methods) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  // Terminal methods resolve the result
  builder.single = vi.fn().mockResolvedValue(result);
  builder.maybeSingle = vi.fn().mockResolvedValue(result);
  // select/order/limit/eq etc. return the builder for chaining
  for (const m of methods.filter((x) => !["single", "maybeSingle"].includes(x))) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  // Make builder itself thenable so `await supabase.from(...).select(...)` works
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (builder as any).then = (resolve: (v: MockQueryResult) => unknown) =>
    Promise.resolve(result).then(resolve);

  return builder;
}

function createMockSupabase(
  fromResults: Record<string, MockQueryResult> = {},
): SupabaseClient {
  const client = {
    from: vi.fn((table: string) => {
      const result = fromResults[table] ?? { data: [], error: null };
      return createMockQueryBuilder(result);
    }),
  };
  return client as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getFeed", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns mapped feed posts from Supabase data", async () => {
    const mockPosts = [
      {
        id: "p1",
        author_id: "u1",
        content: "Hello world",
        image_url: null,
        created_at: "2026-03-21T12:00:00Z",
        profiles: {
          id: "u1",
          username: "alice_dev",
          full_name: "Alice Chen",
          avatar_url: "https://example.com/alice.svg",
          bio: "Dev",
          created_at: "2025-01-01T00:00:00Z",
        },
        likes: [{ user_id: "u2" }],
        comments: [{ id: "c1" }],
      },
    ];

    const supabase = createMockSupabase({
      posts: { data: mockPosts, error: null },
    });

    const { getFeed } = await import("~/lib/models.server");
    const feed = await getFeed(supabase, "u1");

    expect(feed).toHaveLength(1);
    expect(feed[0].id).toBe("p1");
    expect(feed[0].author.username).toBe("alice_dev");
    expect(feed[0].author.displayName).toBe("Alice Chen");
    expect(feed[0].likesCount).toBe(1);
    expect(feed[0].commentsCount).toBe(1);
    expect(feed[0].likedByCurrentUser).toBe(false);
  });

  it("marks likedByCurrentUser true when user's like exists", async () => {
    const mockPosts = [
      {
        id: "p1",
        author_id: "u1",
        content: "Test",
        image_url: null,
        created_at: "2026-01-01T00:00:00Z",
        profiles: {
          id: "u1",
          username: "alice_dev",
          full_name: "Alice",
          avatar_url: "",
          bio: "",
          created_at: "2025-01-01T00:00:00Z",
        },
        likes: [{ user_id: "u2" }],
        comments: [],
      },
    ];

    const supabase = createMockSupabase({
      posts: { data: mockPosts, error: null },
    });

    const { getFeed } = await import("~/lib/models.server");
    const feed = await getFeed(supabase, "u2");
    expect(feed[0].likedByCurrentUser).toBe(true);
  });

  it("handles null currentUserId (anonymous)", async () => {
    const mockPosts = [
      {
        id: "p1",
        author_id: "u1",
        content: "Test",
        image_url: null,
        created_at: "2026-01-01T00:00:00Z",
        profiles: {
          id: "u1",
          username: "alice_dev",
          full_name: "Alice",
          avatar_url: "",
          bio: "",
          created_at: "2025-01-01T00:00:00Z",
        },
        likes: [{ user_id: "u2" }],
        comments: [],
      },
    ];

    const supabase = createMockSupabase({
      posts: { data: mockPosts, error: null },
    });

    const { getFeed } = await import("~/lib/models.server");
    const feed = await getFeed(supabase, null);
    expect(feed[0].likedByCurrentUser).toBe(false);
  });
});

describe("getUser", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns mapped user profile for a known username", async () => {
    const profile = {
      id: "u1",
      username: "alice_dev",
      full_name: "Alice Chen",
      avatar_url: "https://example.com/alice.svg",
      bio: "Full-stack dev",
      created_at: "2025-01-01T00:00:00Z",
    };

    const supabase = createMockSupabase({
      profiles: { data: profile, error: null },
      follows: { data: null, error: null, count: 5 },
    });

    const { getUser } = await import("~/lib/models.server");
    const user = await getUser(supabase, "alice_dev");

    expect(user).toBeDefined();
    expect(user?.username).toBe("alice_dev");
    expect(user?.displayName).toBe("Alice Chen");
  });

  it("returns undefined when user does not exist", async () => {
    const supabase = createMockSupabase({
      profiles: { data: null, error: { message: "not found" } },
    });

    const { getUser } = await import("~/lib/models.server");
    const user = await getUser(supabase, "ghost");
    expect(user).toBeUndefined();
  });
});

describe("createPost", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("inserts a post and returns the created record", async () => {
    const createdPost = {
      id: "new-post-id",
      author_id: "u1",
      content: "Hello from tests!",
      image_url: null,
      created_at: "2026-03-21T12:00:00Z",
    };

    const supabase = createMockSupabase({
      posts: { data: createdPost, error: null },
    });

    const { createPost } = await import("~/lib/models.server");
    const post = await createPost(supabase, "u1", "Hello from tests!");

    expect(post.id).toBe("new-post-id");
    expect(post.authorId).toBe("u1");
    expect(post.content).toBe("Hello from tests!");
    expect(post.likesCount).toBe(0);
    expect(post.commentsCount).toBe(0);
  });
});

describe("toggleLike", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns false (unliked) when like already exists", async () => {
    const supabase = createMockSupabase({
      likes: { data: { id: "existing-like-id" }, error: null },
    });

    const { toggleLike } = await import("~/lib/models.server");
    const result = await toggleLike(supabase, "u1", "p1");
    expect(result).toBe(false);
  });

  it("returns true (liked) when no existing like", async () => {
    const supabase = createMockSupabase({
      likes: { data: null, error: null },
    });

    const { toggleLike } = await import("~/lib/models.server");
    const result = await toggleLike(supabase, "u1", "p1");
    expect(result).toBe(true);
  });
});

describe("isLiked", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns true when a like exists", async () => {
    const supabase = createMockSupabase({
      likes: { data: { id: "like-id" }, error: null },
    });

    const { isLiked } = await import("~/lib/models.server");
    expect(await isLiked(supabase, "u1", "p1")).toBe(true);
  });

  it("returns false when no like exists", async () => {
    const supabase = createMockSupabase({
      likes: { data: null, error: null },
    });

    const { isLiked } = await import("~/lib/models.server");
    expect(await isLiked(supabase, "u1", "p1")).toBe(false);
  });
});
