import { describe, it, expect, beforeEach, vi } from "vitest";

// Re-import a fresh module for every suite so in-memory state is isolated.
async function freshModels() {
  vi.resetModules();
  return import("~/lib/models.server");
}

describe("getFeed", () => {
  it("returns all seed posts in descending chronological order", async () => {
    const { getFeed } = await freshModels();
    const feed = getFeed();
    expect(feed.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < feed.length - 1; i++) {
      expect(new Date(feed[i].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(feed[i + 1].createdAt).getTime(),
      );
    }
  });

  it("each feed item includes an author object with required fields", async () => {
    const { getFeed } = await freshModels();
    for (const item of getFeed()) {
      expect(item.author).toBeDefined();
      expect(typeof item.author.username).toBe("string");
      expect(typeof item.author.displayName).toBe("string");
      expect(typeof item.author.avatar).toBe("string");
    }
  });
});

describe("getUser", () => {
  it("returns the user for a known username", async () => {
    const { getUser } = await freshModels();
    const user = getUser("alice_dev");
    expect(user).toBeDefined();
    expect(user?.id).toBe("u1");
    expect(user?.displayName).toBe("Alice Chen");
  });

  it("returns undefined for an unknown username", async () => {
    const { getUser } = await freshModels();
    expect(getUser("no_one_here")).toBeUndefined();
  });
});

describe("getUserPosts", () => {
  it("returns only posts belonging to the requested user", async () => {
    const { getUserPosts } = await freshModels();
    const posts = getUserPosts("u1");
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      expect(post.authorId).toBe("u1");
    }
  });

  it("returns an empty array for a user with no posts", async () => {
    const { getUserPosts } = await freshModels();
    expect(getUserPosts("u999")).toHaveLength(0);
  });
});

describe("createPost", () => {
  it("adds a new post and makes it appear at the top of the feed", async () => {
    const { createPost, getFeed } = await freshModels();
    const before = getFeed().length;
    const post = createPost("u2", "Hello from tests!");
    expect(post.id).toBeTruthy();
    expect(post.authorId).toBe("u2");
    expect(post.content).toBe("Hello from tests!");
    expect(post.likesCount).toBe(0);
    expect(post.commentsCount).toBe(0);
    expect(post.repostsCount).toBe(0);
    const after = getFeed();
    expect(after.length).toBe(before + 1);
    expect(after[0].id).toBe(post.id);
  });

  it("assigns a unique id for each created post", async () => {
    const { createPost } = await freshModels();
    const a = createPost("u1", "First");
    const b = createPost("u1", "Second");
    expect(a.id).not.toBe(b.id);
  });

  it("stores a valid ISO timestamp as createdAt", async () => {
    const { createPost } = await freshModels();
    const post = createPost("u1", "Timestamp test");
    expect(() => new Date(post.createdAt)).not.toThrow();
    expect(isNaN(new Date(post.createdAt).getTime())).toBe(false);
  });
});

describe("toggleLike", () => {
  it("increments likesCount when the user has not yet liked the post", async () => {
    const { toggleLike, getFeed } = await freshModels();
    const [firstPost] = getFeed();
    const before = firstPost.likesCount;
    const result = toggleLike("u2", firstPost.id);
    expect(result).toBe(true);
    const after = getFeed().find((p) => p.id === firstPost.id)!;
    expect(after.likesCount).toBe(before + 1);
  });

  it("decrements likesCount when the user has already liked the post", async () => {
    const { toggleLike, getFeed } = await freshModels();
    const [firstPost] = getFeed();
    toggleLike("u2", firstPost.id); // like
    const afterLike = getFeed().find((p) => p.id === firstPost.id)!.likesCount;
    const result = toggleLike("u2", firstPost.id); // unlike
    expect(result).toBe(false);
    const afterUnlike = getFeed().find((p) => p.id === firstPost.id)!.likesCount;
    expect(afterUnlike).toBe(afterLike - 1);
  });

  it("does not allow likesCount to go below 0", async () => {
    const { toggleLike, getFeed, createPost } = await freshModels();
    const post = createPost("u1", "zero-floor test");
    // Starts at 0 — unlike without a prior like should stay at 0
    toggleLike("u1", post.id); // like → 1
    toggleLike("u1", post.id); // unlike → 0
    toggleLike("u1", post.id); // like again → 1
    toggleLike("u1", post.id); // unlike → 0
    const current = getFeed().find((p) => p.id === post.id)!;
    expect(current.likesCount).toBeGreaterThanOrEqual(0);
  });

  it("returns false for a non-existent postId", async () => {
    const { toggleLike } = await freshModels();
    expect(toggleLike("u1", "does-not-exist")).toBe(false);
  });
});

describe("isLiked", () => {
  it("returns false before any like", async () => {
    const { isLiked, getFeed } = await freshModels();
    const [firstPost] = getFeed();
    expect(isLiked("u3", firstPost.id)).toBe(false);
  });

  it("returns true after toggling like on, and false again after toggling off", async () => {
    const { isLiked, toggleLike, getFeed } = await freshModels();
    const [firstPost] = getFeed();
    toggleLike("u3", firstPost.id);
    expect(isLiked("u3", firstPost.id)).toBe(true);
    toggleLike("u3", firstPost.id);
    expect(isLiked("u3", firstPost.id)).toBe(false);
  });

  it("likes are user-scoped — one user liking does not affect another", async () => {
    const { isLiked, toggleLike, getFeed } = await freshModels();
    const [firstPost] = getFeed();
    toggleLike("u1", firstPost.id);
    expect(isLiked("u2", firstPost.id)).toBe(false);
  });
});
