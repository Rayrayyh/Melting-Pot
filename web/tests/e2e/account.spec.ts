import { expect, test, type Page } from "@playwright/test";

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("MeltingPot-dev1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
}

test.describe("account and landing for signed-in people", () => {
  test("the account control lives at the foot of the nav, not the top bar", async ({
    page,
  }) => {
    await loginAs(page, "maya@meltingpot.dev");

    const account = page.getByRole("button", { name: "Account menu" });
    await expect(account).toBeVisible();
    await expect(page.getByText("maya@meltingpot.dev").first()).toBeVisible();

    // The top bar keeps the mark and search only.
    const topBar = page.locator("header").first();
    await expect(topBar.getByRole("button", { name: "Account menu" })).toHaveCount(0);
    await expect(topBar.getByLabel("Search")).toBeVisible();

    // Theme switching moved out of the bar and into settings.
    await expect(page.getByRole("button", { name: /Switch to (light|dark) theme/ })).toHaveCount(0);

    await account.click();
    await expect(page.getByRole("button", { name: "My contributions" })).toBeVisible();
    await expect(page.getByRole("button", { name: "About MeltingPot" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/me\/settings/);
  });

  test("settings switches the theme and remembers the choice", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    await page.goto("/me/settings");

    const root = page.locator("html");
    await expect(page.getByRole("radio", { name: "System" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(root).toHaveAttribute("data-theme", "dark");

    // The choice survives a reload, applied before paint.
    await page.reload();
    await expect(root).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // And System hands control back to the device.
    await page.getByRole("radio", { name: "System" }).click();
    await expect(root).not.toHaveAttribute("data-theme", "dark");
  });

  test("two-step sign in is offered to the person who runs the Pot", async ({ page }) => {
    await loginAs(page, "maya@meltingpot.dev");
    await page.goto("/me/settings");
    await expect(page.getByText("Two-step sign in", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Set up two-step sign in" }),
    ).toBeVisible();
  });

  test("two-step sign in is not offered to a plain member", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    await page.goto("/me/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Two-step sign in", { exact: true })).toHaveCount(0);
  });

  test("the landing stays open to signed-in people and points at the dashboard", async ({
    page,
  }) => {
    await loginAs(page, "maya@meltingpot.dev");

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Everyone takes notes. Meltingpot brings them together." }),
    ).toBeVisible();

    // No sign-in or sign-up prompts for someone already signed in.
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Get started" })).toHaveCount(0);

    const dashboardLinks = page.getByRole("link", { name: "Go to dashboard" });
    await expect(dashboardLinks).toHaveCount(2);
    await dashboardLinks.first().click();
    await expect(page).toHaveURL(/\/home/);
  });

  test("the account menu reaches the landing without signing out", async ({ page }) => {
    await loginAs(page, "omar@meltingpot.dev");
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: "About MeltingPot" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "Go to dashboard" }).first()).toBeVisible();

    // Still signed in: a protected route opens without a login redirect.
    await page.goto("/home");
    await expect(page).toHaveURL(/\/home/);
  });

  test("the footer credits the challenge the project was entered in", async ({ page }) => {
    await page.goto("/");
    const credit = page.getByRole("link", { name: /Prometheus August AI Challenge/ });
    await expect(credit).toBeVisible();
    await expect(credit).toHaveAttribute("href", /devpost\.com/);
    await expect(page.getByText("Built for the Prometheus August AI Challenge")).toBeVisible();
  });
});
