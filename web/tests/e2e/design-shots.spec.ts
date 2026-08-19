import { test, expect, type Page } from "@playwright/test";

const SHOTS = "/tmp/claude-0/-home-user-Meltingpot/58cad991-129a-5851-8825-3b529f111197/scratchpad/design3";

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("MeltingPot-dev1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
}

test.use({ viewport: { width: 1440, height: 900 } });

test("landing full page", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/landing-full.png`, fullPage: true });
});

test("home as member and maintainer", async ({ page, browser }) => {
  await loginAs(page, "ava@meltingpot.dev");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/home-member.png`, fullPage: true });

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const maintainer = await ctx.newPage();
  await loginAs(maintainer, "maya@meltingpot.dev");
  await maintainer.waitForTimeout(400);
  await maintainer.screenshot({ path: `${SHOTS}/home-maintainer.png`, fullPage: true });
  await ctx.close();
});

test("feed and note", async ({ page }) => {
  await loginAs(page, "ava@meltingpot.dev");
  await page.getByRole("main").getByRole("link", { name: "Biology 101", exact: true }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]+$/, { timeout: 15_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/feed.png`, fullPage: true });
});
