// Social platform domain models — replace with a real database
export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  joinedAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrl?: string;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

const USERS: User[] = [
  { id: "u1", username: "alice_dev", displayName: "Alice Chen", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=AC", bio: "Full-stack dev. Building cool things with TypeScript.", followersCount: 1240, followingCount: 310, joinedAt: "2025-01-01T00:00:00Z" },
  { id: "u2", username: "bob_builds", displayName: "Bob Smith", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=BS", bio: "Open source advocate. Remix fan.", followersCount: 890, followingCount: 210, joinedAt: "2025-03-15T00:00:00Z" },
  { id: "u3", username: "carol_ux", displayName: "Carol White", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=CW", bio: "UX designer. Making the web more accessible.", followersCount: 2100, followingCount: 180, joinedAt: "2024-09-10T00:00:00Z" },
];

let POSTS: Post[] = [
  { id: "p1", authorId: "u1", content: "Just shipped a new feature using Remix 2 loaders. The progressive enhancement story is unreal! 🚀", likesCount: 42, commentsCount: 8, repostsCount: 12, createdAt: "2026-03-21T12:00:00Z" },
  { id: "p2", authorId: "u3", content: "Accessibility tip: always test with a keyboard before shipping. Tab order matters more than you think.", likesCount: 87, commentsCount: 14, repostsCount: 31, createdAt: "2026-03-21T10:30:00Z" },
  { id: "p3", authorId: "u2", content: "Hot take: co-locating your data fetching with your components (via loaders) is the best DX improvement in years.", likesCount: 134, commentsCount: 22, repostsCount: 45, createdAt: "2026-03-21T08:00:00Z" },
];

let LIKES: Set<string> = new Set(); // "userId:postId"

export function getFeed(): (Post & { author: User })[] {
  return POSTS
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((post) => ({ ...post, author: USERS.find((u) => u.id === post.authorId)! }));
}

export function getUser(username: string): User | undefined {
  return USERS.find((u) => u.username === username);
}

export function getUserPosts(userId: string): Post[] {
  return POSTS.filter((p) => p.authorId === userId);
}

export function createPost(authorId: string, content: string): Post {
  const post: Post = {
    id: crypto.randomUUID(),
    authorId,
    content,
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0,
    createdAt: new Date().toISOString(),
  };
  POSTS.unshift(post);
  return post;
}

export function toggleLike(userId: string, postId: string): boolean {
  const key = `${userId}:${postId}`;
  const post = POSTS.find((p) => p.id === postId);
  if (!post) return false;
  if (LIKES.has(key)) {
    LIKES.delete(key);
    post.likesCount = Math.max(0, post.likesCount - 1);
    return false;
  }
  LIKES.add(key);
  post.likesCount++;
  return true;
}

export function isLiked(userId: string, postId: string): boolean {
  return LIKES.has(`${userId}:${postId}`);
}
