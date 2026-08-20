import { expect, test } from "@playwright/test";

const INVALID_MESSAGE = "We couldn't find that Pot. Check the code and try again.";

test.describe("joining a Pot", () => {
  test("invalid code shows the error and keeps the input", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Enter class code").fill("zzzzzz");
    await page.getByRole("button", { name: "Join Pot" }).click();
    await expect(page.getByText(INVALID_MESSAGE)).toBeVisible();
    await expect(page.getByLabel("Enter class code")).toHaveValue("ZZZZZZ");
    await expect(page).toHaveURL("/");
  });

  test("new student joins with a code, sees the Pot, signs up, lands inside", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Enter class code").fill("bio101");
    await page.getByRole("button", { name: "Join Pot" }).click();

    // Pot preview before any authentication.
    await expect(page).toHaveURL(/\/join\/BIO101/);
    await expect(page.getByText("You joined")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Biology 101" })).toBeVisible();
    await expect(page.getByText(/\d+ members/)).toBeVisible();

    await page.getByRole("link", { name: "Create account" }).click();
    await expect(
      page.getByRole("heading", { name: "You're in. Save your account." }),
    ).toBeVisible();
    await expect(
      page.getByText("Create an account so Biology 101 stays in your vault."),
    ).toBeVisible();

    const email = `e2e.join.${Date.now()}@meltingpot.dev`;
    await page.getByLabel("Display name").fill("E2E Joiner");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("E2ePassword1");
    await page.getByRole("button", { name: "Create account and enter" }).click();

    // Membership finalized; straight into the Pot, no login wall, no detours.
    await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Biology 101" }),
    ).toBeVisible();
  });

  test("an existing member entering the same code just returns to the Pot", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("ava@meltingpot.dev");
    await page.getByLabel("Password").fill("MeltingPot-dev1");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });

    await page.goto("/join/BIO101");
    await expect(page.getByText("Welcome back to")).toBeVisible();
    await page.getByRole("button", { name: "Open Pot" }).click();
    await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Biology 101" })).toBeVisible();
  });

  test("signed-out users are redirected from protected routes to login", async ({
    page,
  }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});
