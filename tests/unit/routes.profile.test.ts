/**
 * Unit tests for app/routes/users.$username.tsx loader + action.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const ALICE: import("~/lib/models.server").User = {
  id: "u1",
  username: "alice_dev",
  displayName: "Alice Chen",
  avatar: "https://example.com/alice.svg",
  bio: "Full-stack dev.",
  followersCount: 1240,
  followingCount: 310,
  joinedAt: "2025-01-01T00:00:00Z",
};

const ALICE_POSTS: import("~/lib/models.server").Post[] = [
  { id: "p1", authorId: "u1", content: "Hello!", likesCount: 5, commentsCount: 1, repostsCount: 2, createdAt: "2026-01-01T00:00:00Z" },
];

function makePostRequest(formData: Record<string, string>): Request {
  const body = new URLSearchParams(formData);
  return new Request("http://localhost/users/alice_dev", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

// --- loader ----------------------------------------------------------------

describe("profile loader", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns user and posts for a known username", async () => {
    vi.doMock("~/lib/models.server", () => ({
      getUser: vi.fn(() => ALICE),
      getUserPosts: vi.fn(() => ALICE_POSTS),
    }));

    const { loader } = await import("~/routes/users.$username");
    const response = await loader({
      request: new Request("http://localhost/users/alice_dev"),
      params: { username: "alice_dev" },
      context: {},
    });
    const data = await response.json();

    expect(data.user.username).toBe("alice_dev");
    expect(data.posts).toHaveLength(1);
    expect(data.posts[0].id).toBe("p1");
  });

  it("throws a 404 Response when the user does not exist", async () => {
    vi.doMock("~/lib/models.server", () => ({
      getUser: vi.fn(() => undefined),
      getUserPosts: vi.fn(() => []),
    }));

    const { loader } = await import("~/routes/users.$username");

    await expect(
      loader({
        request: new Request("http://localhost/users/ghost"),
        params: { username: "ghost" },
        context: {},
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// --- action ----------------------------------------------------------------

describe("profile action — follow intent", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("redirects back to the user profile page on follow", async () => {
    vi.doMock("~/lib/models.server", () => ({
      getUser: vi.fn(() => ALICE),
      getUserPosts: vi.fn(() => []),
    }));

    const { action } = await import("~/routes/users.$username");
    const response = await action({
      request: makePostRequest({ intent: "follow" }),
      params: { username: "alice_dev" },
      context: {},
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/users/alice_dev");
  });
});

describe("profile action — unknown intent", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 400 for an unrecognised intent", async () => {
    vi.doMock("~/lib/models.server", () => ({
      getUser: vi.fn(() => ALICE),
      getUserPosts: vi.fn(() => []),
    }));

    const { action } = await import("~/routes/users.$username");
    const response = await action({
      request: makePostRequest({ intent: "block" }),
      params: { username: "alice_dev" },
      context: {},
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });
});
