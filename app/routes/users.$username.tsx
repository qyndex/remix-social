import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  Link,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { getUser, getUserPosts, toggleFollow, isFollowing } from "~/lib/models.server";
import { getOptionalUser, requireUser } from "~/lib/supabase.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { user: currentUser, supabase, headers } = await getOptionalUser(request);
  const user = await getUser(supabase, params.username as string);
  if (!user) throw new Response("User not found", { status: 404 });
  const posts = await getUserPosts(supabase, user.id);

  const following = currentUser
    ? await isFollowing(supabase, currentUser.id, user.id)
    : false;

  const isOwnProfile = currentUser?.id === user.id;

  return json({ user, posts, following, isOwnProfile, currentUserId: currentUser?.id ?? null }, { headers });
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: data?.user
      ? `${data.user.displayName} (@${data.user.username}) — Remix Social`
      : "User",
  },
];

export async function action({ request, params }: ActionFunctionArgs) {
  const { user, supabase, headers } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "follow") {
    const targetUser = await getUser(supabase, params.username as string);
    if (targetUser) {
      await toggleFollow(supabase, user.id, targetUser.id);
    }
    return redirect(`/users/${params.username}`, { headers });
  }

  return json({ error: "Unknown intent." }, { status: 400, headers });
}

export default function Profile() {
  const { user, posts, following, isOwnProfile, currentUserId } =
    useLoaderData<typeof loader>();

  return (
    <div className="profile-page">
      <div className="profile-nav">
        <Link to="/" className="back-link" aria-label="Back to feed">
          &larr; Feed
        </Link>
      </div>

      <div className="profile-header">
        <img
          src={user.avatar}
          alt={user.displayName}
          width={80}
          height={80}
          className="profile-avatar"
        />
        <div className="profile-info">
          <h1>{user.displayName}</h1>
          <p className="profile-username">@{user.username}</p>
          <p className="profile-bio">{user.bio}</p>
          <div className="profile-stats">
            <span>
              <strong>{user.followersCount.toLocaleString()}</strong> Followers
            </span>
            <span>
              <strong>{user.followingCount.toLocaleString()}</strong> Following
            </span>
            <span>
              <strong>{posts.length}</strong> Posts
            </span>
          </div>
        </div>
        {!isOwnProfile && (
          currentUserId ? (
            <Form method="post">
              <input type="hidden" name="intent" value="follow" />
              <button
                type="submit"
                className={following ? "btn-following" : "btn-follow"}
                aria-label={
                  following
                    ? `Unfollow ${user.displayName}`
                    : `Follow ${user.displayName}`
                }
              >
                {following ? "Following" : "Follow"}
              </button>
            </Form>
          ) : (
            <Link to="/auth/login" className="btn-follow" aria-label="Log in to follow">
              Follow
            </Link>
          )
        )}
      </div>

      <section
        aria-label={`${user.displayName}'s posts`}
        className="profile-posts"
      >
        <h2>Posts</h2>
        {posts.length === 0 && <p className="empty">No posts yet.</p>}
        {posts.map((post) => (
          <article key={post.id} className="post-card">
            <p className="post-content">{post.content}</p>
            <div className="post-actions">
              <span>&#x2764; {post.likesCount}</span>
              <span>&#x1F4AC; {post.commentsCount}</span>
            </div>
            <time dateTime={post.createdAt} className="post-time">
              {new Date(post.createdAt).toLocaleDateString()}
            </time>
          </article>
        ))}
      </section>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <div className="error-box">
        <h2>
          {error.status}: {error.data}
        </h2>
        <Link to="/">&larr; Home</Link>
      </div>
    );
  }
  return (
    <div className="error-box">
      <h2>Unexpected error</h2>
      <Link to="/">&larr; Home</Link>
    </div>
  );
}
