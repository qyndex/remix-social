import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  useFetcher,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { getFeed, createPost, toggleLike } from "~/lib/models.server";

// Demo: hard-code current user — replace with real session auth
const DEMO_USER_ID = "u1";

export const meta: MetaFunction = () => [{ title: "Feed — Remix Social" }];

export async function loader({ request: _request }: LoaderFunctionArgs) {
  const feed = getFeed();
  return json({ feed, currentUserId: DEMO_USER_ID });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "post") {
    const content = (formData.get("content") as string)?.trim();
    if (!content || content.length > 280) {
      return json({ error: "Content must be 1–280 characters." }, { status: 400 });
    }
    createPost(DEMO_USER_ID, content);
    return redirect("/");
  }

  if (intent === "like") {
    const postId = formData.get("postId") as string;
    toggleLike(DEMO_USER_ID, postId);
    return json({ ok: true });
  }

  return json({ error: "Unknown intent." }, { status: 400 });
}

function PostCard({ post, currentUserId }: { post: ReturnType<typeof getFeed>[number]; currentUserId: string }) {
  const fetcher = useFetcher();
  const isOptimisticLiked = fetcher.formData?.get("postId") === post.id;

  return (
    <article className="post-card">
      <div className="post-header">
        <a href={`/users/${post.author.username}`} className="avatar-link">
          <img src={post.author.avatar} alt={post.author.displayName} width={40} height={40} className="avatar" />
        </a>
        <div>
          <a href={`/users/${post.author.username}`} className="display-name">{post.author.displayName}</a>
          <span className="username">@{post.author.username}</span>
        </div>
        <time className="post-time" dateTime={post.createdAt}>
          {new Date(post.createdAt).toLocaleDateString()}
        </time>
      </div>
      <p className="post-content">{post.content}</p>
      <div className="post-actions">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="like" />
          <input type="hidden" name="postId" value={post.id} />
          <button
            type="submit"
            className={`action-btn like-btn${isOptimisticLiked ? " liked" : ""}`}
            aria-label={`Like this post, currently ${post.likesCount} likes`}
          >
            ♥ {post.likesCount}
          </button>
        </fetcher.Form>
        <span className="action-count" aria-label={`${post.commentsCount} comments`}>
          💬 {post.commentsCount}
        </span>
        <span className="action-count" aria-label={`${post.repostsCount} reposts`}>
          🔁 {post.repostsCount}
        </span>
      </div>
    </article>
  );
}

export default function Feed() {
  const { feed, currentUserId } = useLoaderData<typeof loader>();

  return (
    <div className="feed-layout">
      {/* Compose */}
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
          <button type="submit" className="btn-post" aria-label="Post">Post</button>
        </div>
      </Form>

      {/* Feed */}
      <div aria-label="Feed">
        {feed.length === 0 && <p className="empty">Nothing in your feed yet.</p>}
        {feed.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return <div className="error-box"><h2>{error.status}: {error.statusText}</h2></div>;
  }
  return <div className="error-box"><h2>Unexpected error</h2></div>;
}
