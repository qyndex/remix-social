import { test, expect } from "@playwright/test";

test.describe("Feed page (anonymous)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has correct page title", async ({ page }) => {
    await expect(page).toHaveTitle(/Feed — Remix Social/);
  });

  test("shows login/signup links for anonymous users", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("shows a prompt to log in instead of compose form", async ({ page }) => {
    await expect(page.getByText("Log in")).toBeVisible();
  });

  test("renders seed posts in the feed", async ({ page }) => {
    const feed = page.getByLabel("Feed");
    await expect(feed).toBeVisible();

    // At least one article card should be present from the seed data
    const cards = feed.locator("article");
    await expect(cards).not.toHaveCount(0);
  });

  test("author avatar links navigate to the user profile", async ({ page }) => {
    const avatarLink = page.locator(".avatar-link").first();
    const href = await avatarLink.getAttribute("href");
    expect(href).toMatch(/^\/users\//);
  });

  test("post author display name is a link to the profile", async ({ page }) => {
    const nameLink = page.locator(".display-name").first();
    const href = await nameLink.getAttribute("href");
    expect(href).toMatch(/^\/users\//);
  });
});

test.describe("Feed page — error state", () => {
  test("shows 404 page when navigating to an unknown user", async ({ page }) => {
    await page.goto("/users/this_user_does_not_exist_xyz");
    await expect(page.getByText(/404/)).toBeVisible();
  });
});

test.describe("Auth pages", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page).toHaveTitle(/Log In — Remix Social/);
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("signup page renders correctly", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page).toHaveTitle(/Sign Up — Remix Social/);
    await expect(page.getByRole("heading", { name: "Sign Up" })).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  });

  test("login form shows error for invalid credentials", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("Email address").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
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

  test("has a Follow button/link", async ({ page }) => {
    await page.goto("/users/alice_dev");
    // Anonymous users see a Follow link (to login), or button for authenticated
    const followEl = page.locator(".btn-follow, .btn-following").first();
    await expect(followEl).toBeVisible();
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

  test("back to feed link is present", async ({ page }) => {
    await page.goto("/users/alice_dev");
    await expect(page.getByRole("link", { name: "Back to feed" })).toBeVisible();
  });
});
