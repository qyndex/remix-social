/**
 * Unit tests for app/routes/_index.tsx loader + action.
 *
 * We mock the models and supabase modules so the route logic is tested
 * in isolation from the database.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- helpers ---------------------------------------------------------------

function makeRequest(formData: Record<string, string>): Request {
  const body = new URLSearchParams(formData);
  return new Request("http://localhost/", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

const MOCK_USER = { id: "u1", email: "alice@example.com" };
const MOCK_SUPABASE = {};
const MOCK_HEADERS = new Headers();

// --- loader ----------------------------------------------------------------

describe("_index loader", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns feed and currentUserId for authenticated user", async () => {
    vi.doMock("~/lib/supabase.server", () => ({
      getOptionalUser: vi.fn(async () => ({
        user: MOCK_USER,
        supabase: MOCK_SUPABASE,
        headers: MOCK_HEADERS,
      })),
      requireUser: vi.fn(),
    }));

    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(async () => [
        {
          id: "p1",
          content: "Test post",
          author: { username: "alice_dev", displayName: "Alice", avatar: "" },
          likesCount: 0,
          commentsCount: 0,
          createdAt: "2026-01-01T00:00:00Z",
          authorId: "u1",
          likedByCurrentUser: false,
        },
      ]),
      createPost: vi.fn(),
      toggleLike: vi.fn(),
    }));

    const { loader } = await import("~/routes/_index");
    const response = await loader({
      request: new Request("http://localhost/"),
      params: {},
      context: {},
    });
    const data = await response.json();

    expect(data.feed).toHaveLength(1);
    expect(data.feed[0].id).toBe("p1");
    expect(data.currentUserId).toBe("u1");
  });

  it("returns null currentUserId for anonymous user", async () => {
    vi.doMock("~/lib/supabase.server", () => ({
      getOptionalUser: vi.fn(async () => ({
        user: null,
        supabase: MOCK_SUPABASE,
        headers: MOCK_HEADERS,
      })),
      requireUser: vi.fn(),
    }));

    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(async () => []),
      createPost: vi.fn(),
      toggleLike: vi.fn(),
    }));

    const { loader } = await import("~/routes/_index");
    const response = await loader({
      request: new Request("http://localhost/"),
      params: {},
      context: {},
    });
    const data = await response.json();

    expect(data.currentUserId).toBeNull();
  });
});

// --- action ----------------------------------------------------------------

describe("_index action -- post intent", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates a post and redirects to / on valid content", async () => {
    const mockCreatePost = vi.fn(async () => ({
      id: "new",
      authorId: "u1",
      content: "hi",
      likesCount: 0,
      commentsCount: 0,
      createdAt: "",
    }));

    vi.doMock("~/lib/supabase.server", () => ({
      getOptionalUser: vi.fn(),
      requireUser: vi.fn(async () => ({
        user: MOCK_USER,
        supabase: MOCK_SUPABASE,
        headers: MOCK_HEADERS,
      })),
    }));

    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(async () => []),
      createPost: mockCreatePost,
      toggleLike: vi.fn(),
    }));

    const { action } = await import("~/routes/_index");
    const response = await action({
      request: makeRequest({ intent: "post", content: "Hello world" }),
      params: {},
      context: {},
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/");
    expect(mockCreatePost).toHaveBeenCalledWith(
      MOCK_SUPABASE,
      "u1",
      "Hello world",
    );
  });

  it("returns 400 when content is empty", async () => {
    vi.doMock("~/lib/supabase.server", () => ({
      getOptionalUser: vi.fn(),
      requireUser: vi.fn(async () => ({
        user: MOCK_USER,
        supabase: MOCK_SUPABASE,
        headers: MOCK_HEADERS,
      })),
    }));

    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(async () => []),
      createPost: vi.fn(),
      toggleLike: vi.fn(),
    }));

    const { action } = await import("~/routes/_index");
    const response = await action({
      request: makeRequest({ intent: "post", content: "" }),
      params: {},
      context: {},
    });
    expect(response.status).toBe(400);
    const data = await response.json() as Record<string, unknown>;
    expect(data.error).toBeTruthy();
  });

  it("returns 400 when content exceeds 280 characters", async () => {
    vi.doMock("~/lib/supabase.server", () => ({
      getOptionalUser: vi.fn(),
      requireUser: vi.fn(async () => ({
        user: MOCK_USER,
        supabase: MOCK_SUPABASE,
        headers: MOCK_HEADERS,
      })),
    }));

    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(async () => []),
      createPost: vi.fn(),
      toggleLike: vi.fn(),
    }));

    const { action } = await import("~/routes/_index");
    const longContent = "x".repeat(281);
    const response = await action({
      request: makeRequest({ intent: "post", content: longContent }),
      params: {},
      context: {},
    });
    expect(response.status).toBe(400);
  });

  it("accepts content of exactly 280 characters", async () => {
    const mockCreatePost = vi.fn(async () => ({
      id: "x",
      authorId: "u1",
      content: "",
      likesCount: 0,
      commentsCount: 0,
      createdAt: "",
    }));

    vi.doMock("~/lib/supabase.server", () => ({
      getOptionalUser: vi.fn(),
      requireUser: vi.fn(async () => ({
        user: MOCK_USER,
        supabase: MOCK_SUPABASE,
        headers: MOCK_HEADERS,
      })),
    }));

    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(async () => []),
      createPost: mockCreatePost,
      toggleLike: vi.fn(),
    }));

    const { action } = await import("~/routes/_index");
    const exactContent = "a".repeat(280);
    const response = await action({
      request: makeRequest({ intent: "post", content: exactContent }),
      params: {},
      context: {},
    });
    expect(response.status).toBe(302);
  });
});

describe("_index action -- like intent", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("calls toggleLike and returns ok: true", async () => {
    const mockToggleLike = vi.fn(async () => true);

    vi.doMock("~/lib/supabase.server", () => ({
      getOptionalUser: vi.fn(),
      requireUser: vi.fn(async () => ({
        user: MOCK_USER,
        supabase: MOCK_SUPABASE,
        headers: MOCK_HEADERS,
      })),
    }));

    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(async () => []),
      createPost: vi.fn(),
      toggleLike: mockToggleLike,
    }));

    const { action } = await import("~/routes/_index");
    const response = await action({
      request: makeRequest({ intent: "like", postId: "p1" }),
      params: {},
      context: {},
    });
    expect(response.status).toBe(200);
    const data = await response.json() as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(mockToggleLike).toHaveBeenCalledWith(MOCK_SUPABASE, "u1", "p1");
  });
});

describe("_index action -- unknown intent", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 400 for an unrecognised intent", async () => {
    vi.doMock("~/lib/supabase.server", () => ({
      getOptionalUser: vi.fn(),
      requireUser: vi.fn(async () => ({
        user: MOCK_USER,
        supabase: MOCK_SUPABASE,
        headers: MOCK_HEADERS,
      })),
    }));

    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(async () => []),
      createPost: vi.fn(),
      toggleLike: vi.fn(),
    }));

    const { action } = await import("~/routes/_index");
    const response = await action({
      request: makeRequest({ intent: "delete" }),
      params: {},
      context: {},
    });
    expect(response.status).toBe(400);
  });
});
