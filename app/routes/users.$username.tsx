import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { getUser, getUserPosts } from "~/lib/models.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const user = getUser(params.username as string);
  if (!user) throw new Response("User not found", { status: 404 });
  const posts = getUserPosts(user.id);
  return json({ user, posts });
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.user ? `${data.user.displayName} (@${data.user.username}) — Remix Social` : "User" },
];

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  if (intent === "follow") {
    // Toggle follow — implement with real DB
    return redirect(`/users/${params.username}`);
  }
  return json({ error: "Unknown intent." }, { status: 400 });
}

export default function Profile() {
  const { user, posts } = useLoaderData<typeof loader>();

  return (
    <div className="profile-page">
      <div className="profile-header">
        <img src={user.avatar} alt={user.displayName} width={80} height={80} className="profile-avatar" />
        <div className="profile-info">
          <h1>{user.displayName}</h1>
          <p className="profile-username">@{user.username}</p>
          <p className="profile-bio">{user.bio}</p>
          <div className="profile-stats">
            <span><strong>{user.followersCount.toLocaleString()}</strong> Followers</span>
            <span><strong>{user.followingCount.toLocaleString()}</strong> Following</span>
            <span><strong>{posts.length}</strong> Posts</span>
          </div>
        </div>
        <Form method="post">
          <input type="hidden" name="intent" value="follow" />
          <button type="submit" className="btn-follow" aria-label={`Follow ${user.displayName}`}>Follow</button>
        </Form>
      </div>

      <section aria-label={`${user.displayName}'s posts`} className="profile-posts">
        <h2>Posts</h2>
        {posts.length === 0 && <p className="empty">No posts yet.</p>}
        {posts.map((post) => (
          <article key={post.id} className="post-card">
            <p className="post-content">{post.content}</p>
            <div className="post-actions">
              <span>♥ {post.likesCount}</span>
              <span>💬 {post.commentsCount}</span>
              <span>🔁 {post.repostsCount}</span>
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
    return <div className="error-box"><h2>{error.status}: {error.data}</h2><a href="/">← Home</a></div>;
  }
  return <div className="error-box"><h2>Unexpected error</h2><a href="/">← Home</a></div>;
}
