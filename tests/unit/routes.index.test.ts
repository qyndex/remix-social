/**
 * Unit tests for app/routes/_index.tsx loader + action.
 *
 * Remix loaders/actions are plain async functions — we call them directly
 * without spinning up an HTTP server. We mock the models module so the route
 * logic is tested in isolation from the in-memory data store.
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

// --- loader ----------------------------------------------------------------

describe("_index loader", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns feed and currentUserId", async () => {
    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(() => [
        { id: "p1", content: "Test post", author: { username: "alice_dev", displayName: "Alice", avatar: "" }, likesCount: 0, commentsCount: 0, repostsCount: 0, createdAt: "2026-01-01T00:00:00Z", authorId: "u1" },
      ]),
      createPost: vi.fn(),
      toggleLike: vi.fn(),
    }));

    const { loader } = await import("~/routes/_index");
    const response = await loader({ request: new Request("http://localhost/"), params: {}, context: {} });
    const data = await response.json();

    expect(data.feed).toHaveLength(1);
    expect(data.feed[0].id).toBe("p1");
    expect(data.currentUserId).toBe("u1");
  });
});

// --- action ----------------------------------------------------------------

describe("_index action — post intent", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates a post and redirects to / on valid content", async () => {
    const mockCreatePost = vi.fn(() => ({ id: "new", authorId: "u1", content: "hi", likesCount: 0, commentsCount: 0, repostsCount: 0, createdAt: "" }));
    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(() => []),
      createPost: mockCreatePost,
      toggleLike: vi.fn(),
    }));

    const { action } = await import("~/routes/_index");
    const response = await action({ request: makeRequest({ intent: "post", content: "Hello world" }), params: {}, context: {} });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/");
    expect(mockCreatePost).toHaveBeenCalledWith("u1", "Hello world");
  });

  it("returns 400 when content is empty", async () => {
    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(() => []),
      createPost: vi.fn(),
      toggleLike: vi.fn(),
    }));

    const { action } = await import("~/routes/_index");
    const response = await action({ request: makeRequest({ intent: "post", content: "" }), params: {}, context: {} });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  it("returns 400 when content exceeds 280 characters", async () => {
    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(() => []),
      createPost: vi.fn(),
      toggleLike: vi.fn(),
    }));

    const { action } = await import("~/routes/_index");
    const longContent = "x".repeat(281);
    const response = await action({ request: makeRequest({ intent: "post", content: longContent }), params: {}, context: {} });
    expect(response.status).toBe(400);
  });

  it("accepts content of exactly 280 characters", async () => {
    const mockCreatePost = vi.fn(() => ({ id: "x", authorId: "u1", content: "", likesCount: 0, commentsCount: 0, repostsCount: 0, createdAt: "" }));
    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(() => []),
      createPost: mockCreatePost,
      toggleLike: vi.fn(),
    }));

    const { action } = await import("~/routes/_index");
    const exactContent = "a".repeat(280);
    const response = await action({ request: makeRequest({ intent: "post", content: exactContent }), params: {}, context: {} });
    expect(response.status).toBe(302);
  });
});

describe("_index action — like intent", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("calls toggleLike and returns ok: true", async () => {
    const mockToggleLike = vi.fn(() => true);
    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(() => []),
      createPost: vi.fn(),
      toggleLike: mockToggleLike,
    }));

    const { action } = await import("~/routes/_index");
    const response = await action({ request: makeRequest({ intent: "like", postId: "p1" }), params: {}, context: {} });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(mockToggleLike).toHaveBeenCalledWith("u1", "p1");
  });
});

describe("_index action — unknown intent", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 400 for an unrecognised intent", async () => {
    vi.doMock("~/lib/models.server", () => ({
      getFeed: vi.fn(() => []),
      createPost: vi.fn(),
      toggleLike: vi.fn(),
    }));

    const { action } = await import("~/routes/_index");
    const response = await action({ request: makeRequest({ intent: "delete" }), params: {}, context: {} });
    expect(response.status).toBe(400);
  });
});
