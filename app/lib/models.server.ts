import type { SupabaseClient } from "@supabase/supabase-js";

// -------------------------------------------------------------------
// Domain types
// -------------------------------------------------------------------

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
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface FeedPost extends Post {
  author: User;
  likedByCurrentUser: boolean;
}

// -------------------------------------------------------------------
// Helpers — map DB rows to domain types
// -------------------------------------------------------------------

function mapProfile(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    displayName: (row.full_name as string) || (row.username as string),
    avatar: (row.avatar_url as string) || "",
    bio: (row.bio as string) || "",
    followersCount: Number(row.followers_count ?? 0),
    followingCount: Number(row.following_count ?? 0),
    joinedAt: row.created_at as string,
  };
}

// -------------------------------------------------------------------
// Feed
// -------------------------------------------------------------------

export async function getFeed(
  supabase: SupabaseClient,
  currentUserId: string | null,
): Promise<FeedPost[]> {
  // Fetch posts with author profile, likes count, comments count
  const { data: posts, error } = await supabase
    .from("posts")
    .select(`
      id,
      author_id,
      content,
      image_url,
      created_at,
      profiles!posts_author_id_fkey (
        id,
        username,
        full_name,
        avatar_url,
        bio,
        created_at
      ),
      likes ( user_id ),
      comments ( id )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Response("Failed to load feed", { status: 500 });

  return (posts ?? []).map((p: Record<string, unknown>) => {
    const profile = p.profiles as Record<string, unknown>;
    const likesArr = (p.likes ?? []) as Array<{ user_id: string }>;
    const commentsArr = (p.comments ?? []) as Array<{ id: string }>;

    return {
      id: p.id as string,
      authorId: p.author_id as string,
      content: p.content as string,
      imageUrl: p.image_url as string | undefined,
      likesCount: likesArr.length,
      commentsCount: commentsArr.length,
      createdAt: p.created_at as string,
      likedByCurrentUser: currentUserId
        ? likesArr.some((l) => l.user_id === currentUserId)
        : false,
      author: {
        id: profile.id as string,
        username: profile.username as string,
        displayName: (profile.full_name as string) || (profile.username as string),
        avatar: (profile.avatar_url as string) || "",
        bio: (profile.bio as string) || "",
        followersCount: 0, // Not needed in feed cards
        followingCount: 0,
        joinedAt: profile.created_at as string,
      },
    };
  });
}

// -------------------------------------------------------------------
// User / Profile
// -------------------------------------------------------------------

export async function getUser(
  supabase: SupabaseClient,
  username: string,
): Promise<User | undefined> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !profile) return undefined;

  // Followers count
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.id);

  // Following count
  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.id);

  return mapProfile({
    ...profile,
    followers_count: followersCount ?? 0,
    following_count: followingCount ?? 0,
  });
}

export async function getUserPosts(
  supabase: SupabaseClient,
  userId: string,
): Promise<Post[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select(`
      id,
      author_id,
      content,
      image_url,
      created_at,
      likes ( id ),
      comments ( id )
    `)
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Response("Failed to load user posts", { status: 500 });

  return (posts ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    authorId: p.author_id as string,
    content: p.content as string,
    imageUrl: p.image_url as string | undefined,
    likesCount: ((p.likes ?? []) as Array<{ id: string }>).length,
    commentsCount: ((p.comments ?? []) as Array<{ id: string }>).length,
    createdAt: p.created_at as string,
  }));
}

// -------------------------------------------------------------------
// Create post
// -------------------------------------------------------------------

export async function createPost(
  supabase: SupabaseClient,
  authorId: string,
  content: string,
): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: authorId, content })
    .select("id, author_id, content, image_url, created_at")
    .single();

  if (error || !data) throw new Response("Failed to create post", { status: 500 });

  return {
    id: data.id,
    authorId: data.author_id,
    content: data.content,
    imageUrl: data.image_url ?? undefined,
    likesCount: 0,
    commentsCount: 0,
    createdAt: data.created_at,
  };
}

// -------------------------------------------------------------------
// Like / Unlike
// -------------------------------------------------------------------

export async function toggleLike(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
): Promise<boolean> {
  // Check if already liked
  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("likes").delete().eq("id", existing.id);
    return false; // unliked
  }

  const { error } = await supabase
    .from("likes")
    .insert({ post_id: postId, user_id: userId });

  if (error) return false;
  return true; // liked
}

export async function isLiked(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  return !!data;
}

// -------------------------------------------------------------------
// Follow / Unfollow
// -------------------------------------------------------------------

export async function toggleFollow(
  supabase: SupabaseClient,
  followerId: string,
  followingId: string,
): Promise<boolean> {
  if (followerId === followingId) return false;

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    return false; // unfollowed
  }

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: followerId, following_id: followingId });

  if (error) return false;
  return true; // followed
}

export async function isFollowing(
  supabase: SupabaseClient,
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  return !!data;
}
