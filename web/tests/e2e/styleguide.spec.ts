import { expect, test } from "@playwright/test";

const themes = ["light", "dark"] as const;

for (const theme of themes) {
  test(`styleguide renders in ${theme} theme`, async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem("mp-theme", t);
    }, theme);
    await page.goto("/dev/styleguide");
    await expect(page.getByRole("heading", { name: "Styleguide" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Share with class" }).first()).toBeVisible();
    await expect(page.getByText("Waiting on maintainer")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.screenshot({
      path: `test-results/styleguide-${theme}.png`,
      fullPage: true,
    });
  });
}

test("landing shows the class code hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Enter class code")).toBeVisible();
  await expect(page.getByRole("button", { name: "Join Pot" })).toBeDisabled();
  await page.getByLabel("Enter class code").fill("d2z7gg");
  await expect(page.getByLabel("Enter class code")).toHaveValue("D2Z7GG");
  await expect(page.getByRole("button", { name: "Join Pot" })).toBeEnabled();
});
