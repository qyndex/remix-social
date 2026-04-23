import { test, expect } from "@playwright/test";

test.describe("Feed page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has correct page title", async ({ page }) => {
    await expect(page).toHaveTitle(/Feed — Remix Social/);
  });

  test("shows the compose form with accessible label", async ({ page }) => {
    const form = page.getByRole("form", { name: "New post" });
    await expect(form).toBeVisible();
  });

  test("compose textarea is present and accepts input", async ({ page }) => {
    const textarea = page.getByRole("textbox", { name: "Post content" });
    await expect(textarea).toBeVisible();
    await textarea.fill("Testing from Playwright");
    await expect(textarea).toHaveValue("Testing from Playwright");
  });

  test("Post button has accessible label", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Post" })).toBeVisible();
  });

  test("renders seed posts in the feed", async ({ page }) => {
    const feed = page.getByLabel("Feed");
    await expect(feed).toBeVisible();

    // At least one article card should be present from the seed data
    const cards = feed.locator("article");
    await expect(cards).not.toHaveCount(0);
  });

  test("each post card has a like button with aria-label", async ({ page }) => {
    const firstLikeBtn = page
      .getByRole("button", { name: /Like this post/ })
      .first();
    await expect(firstLikeBtn).toBeVisible();
  });

  test("author avatar links navigate to the user profile", async ({ page }) => {
    // Get first avatar link href and verify it points to /users/...
    const avatarLink = page.locator(".avatar-link").first();
    const href = await avatarLink.getAttribute("href");
    expect(href).toMatch(/^\/users\//);
  });

  test("post author display name is a link to the profile", async ({ page }) => {
    const nameLink = page.locator(".display-name").first();
    const href = await nameLink.getAttribute("href");
    expect(href).toMatch(/^\/users\//);
  });

  test("can submit a new post and it appears in the feed", async ({ page }) => {
    const textarea = page.getByRole("textbox", { name: "Post content" });
    const postButton = page.getByRole("button", { name: "Post" });

    const unique = `E2E test post ${Date.now()}`;
    await textarea.fill(unique);
    await postButton.click();

    // After redirect back to /, the new post should be visible
    await page.waitForURL("/");
    await expect(page.getByText(unique)).toBeVisible();
  });
});

test.describe("Feed page — error state", () => {
  test("shows 404 page when navigating to an unknown user", async ({ page }) => {
    await page.goto("/users/this_user_does_not_exist_xyz");
    // ErrorBoundary renders the status code
    await expect(page.getByText(/404/)).toBeVisible();
  });
});

test.describe("User profile page", () => {
  test("shows alice's profile with display name and username", async ({ page }) => {
    await page.goto("/users/alice_dev");
    await expect(page.getByRole("heading", { name: "Alice Chen" })).toBeVisible();
    await expect(page.getByText("@alice_dev")).toBeVisible();
  });

  test("has the correct page title", async ({ page }) => {
    await page.goto("/users/alice_dev");
    await expect(page).toHaveTitle(/Alice Chen.*Remix Social/);
  });

  test("shows follower and following counts", async ({ page }) => {
    await page.goto("/users/alice_dev");
    await expect(page.getByText("Followers")).toBeVisible();
    await expect(page.getByText("Following")).toBeVisible();
  });

  test("has a Follow button with accessible label", async ({ page }) => {
    await page.goto("/users/alice_dev");
    await expect(
      page.getByRole("button", { name: /Follow Alice Chen/ }),
    ).toBeVisible();
  });

  test("shows the user's posts section", async ({ page }) => {
    await page.goto("/users/alice_dev");
    await expect(
      page.getByRole("region", { name: "Alice Chen's posts" }),
    ).toBeVisible();
  });

  test("posts section heading is 'Posts'", async ({ page }) => {
    await page.goto("/users/alice_dev");
    const section = page.getByRole("region", { name: "Alice Chen's posts" });
    await expect(section.getByRole("heading", { name: "Posts" })).toBeVisible();
  });

  test("clicking Follow redirects back to the same profile", async ({ page }) => {
    await page.goto("/users/alice_dev");
    await page.getByRole("button", { name: /Follow Alice Chen/ }).click();
    await page.waitForURL("/users/alice_dev");
    await expect(page).toHaveURL("/users/alice_dev");
  });
});
