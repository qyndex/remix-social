import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  Link,
  useFetcher,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { getFeed, createPost, toggleLike } from "~/lib/models.server";
import type { FeedPost } from "~/lib/models.server";
import { getOptionalUser, requireUser } from "~/lib/supabase.server";

export const meta: MetaFunction = () => [{ title: "Feed — Remix Social" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, supabase, headers } = await getOptionalUser(request);
  const feed = await getFeed(supabase, user?.id ?? null);
  return json({ feed, currentUserId: user?.id ?? null }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { user, supabase, headers } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "post") {
    const content = (formData.get("content") as string)?.trim();
    if (!content || content.length > 280) {
      return json(
        { error: "Content must be 1-280 characters." },
        { status: 400, headers },
      );
    }
    await createPost(supabase, user.id, content);
    return redirect("/", { headers });
  }

  if (intent === "like") {
    const postId = formData.get("postId") as string;
    await toggleLike(supabase, user.id, postId);
    return json({ ok: true }, { headers });
  }

  return json({ error: "Unknown intent." }, { status: 400, headers });
}

function PostCard({
  post,
  currentUserId,
}: {
  post: FeedPost;
  currentUserId: string | null;
}) {
  const fetcher = useFetcher();
  const isOptimisticLiked =
    fetcher.formData?.get("postId") === post.id
      ? !post.likedByCurrentUser
      : post.likedByCurrentUser;
  const optimisticLikesCount =
    fetcher.formData?.get("postId") === post.id
      ? post.likedByCurrentUser
        ? post.likesCount - 1
        : post.likesCount + 1
      : post.likesCount;

  return (
    <article className="post-card">
      <div className="post-header">
        <Link to={`/users/${post.author.username}`} className="avatar-link">
          <img
            src={post.author.avatar}
            alt={post.author.displayName}
            width={40}
            height={40}
            className="avatar"
          />
        </Link>
        <div>
          <Link to={`/users/${post.author.username}`} className="display-name">
            {post.author.displayName}
          </Link>
          <span className="username">@{post.author.username}</span>
        </div>
        <time className="post-time" dateTime={post.createdAt}>
          {new Date(post.createdAt).toLocaleDateString()}
        </time>
      </div>
      <p className="post-content">{post.content}</p>
      <div className="post-actions">
        {currentUserId ? (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="like" />
            <input type="hidden" name="postId" value={post.id} />
            <button
              type="submit"
              className={`action-btn like-btn${isOptimisticLiked ? " liked" : ""}`}
              aria-label={`Like this post, currently ${optimisticLikesCount} likes`}
            >
              {isOptimisticLiked ? "\u2764" : "\u2661"} {optimisticLikesCount}
            </button>
          </fetcher.Form>
        ) : (
          <Link to="/auth/login" className="action-btn like-btn" aria-label="Log in to like">
            &#x2661; {post.likesCount}
          </Link>
        )}
        <span
          className="action-count"
          aria-label={`${post.commentsCount} comments`}
        >
          &#x1F4AC; {post.commentsCount}
        </span>
      </div>
    </article>
  );
}

export default function Feed() {
  const { feed, currentUserId } = useLoaderData<typeof loader>();

  return (
    <div className="feed-layout">
      {/* Auth bar */}
      <div className="auth-bar">
        {currentUserId ? (
          <Form method="post" action="/auth/logout">
            <button type="submit" className="btn-logout" aria-label="Log out">
              Log out
            </button>
          </Form>
        ) : (
          <div className="auth-links">
            <Link to="/auth/login" className="auth-link">Log in</Link>
            <Link to="/auth/signup" className="auth-link">Sign up</Link>
          </div>
        )}
      </div>

      {/* Compose — only for authenticated users */}
      {currentUserId ? (
        <Form method="post" className="compose-form" aria-label="New post">
          <input type="hidden" name="intent" value="post" />
          <textarea
            name="content"
            placeholder="What's on your mind?"
            maxLength={280}
            required
            aria-label="Post content"
            className="compose-textarea"
            rows={3}
          />
          <div className="compose-footer">
            <button type="submit" className="btn-post" aria-label="Post">
              Post
            </button>
          </div>
        </Form>
      ) : (
        <div className="compose-form">
          <p className="empty">
            <Link to="/auth/login" className="auth-link">Log in</Link> to share your thoughts.
          </p>
        </div>
      )}

      {/* Feed */}
      <div aria-label="Feed">
        {feed.length === 0 && (
          <p className="empty">Nothing in your feed yet.</p>
        )}
        {feed.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <div className="error-box">
        <h2>
          {error.status}: {error.statusText}
        </h2>
      </div>
    );
  }
  return (
    <div className="error-box">
      <h2>Unexpected error</h2>
    </div>
  );
}
