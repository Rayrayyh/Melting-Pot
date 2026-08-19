import { expect, test, type Page } from "@playwright/test";

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("MeltingPot-dev1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
}

test("version history shows the full attribution trail and readable versions", async ({
  page,
}) => {
  await loginAs(page, "ava@meltingpot.dev");
  await page.getByRole("main").getByRole("link", { name: "Biology 101", exact: true }).click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });
  await page.getByRole("link", { name: "Mitosis vs meiosis" }).first().click();
  await page.getByRole("link", { name: "History" }).click();

  await expect(page.getByRole("heading", { name: "Version history" })).toBeVisible();

  // The corrected version is current, with dual credit and the reviewer.
  await expect(page.getByRole("button", { name: /Version 2/ })).toBeVisible();
  await expect(page.getByText("Correction by Omar Haddad").first()).toBeVisible();
  await expect(page.getByText(/approved by Maya Chen/).first()).toBeVisible();
  await expect(page.getByText("Current", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Source: OpenStax Biology, section 10.2")).toBeVisible();

  // The change from version 1 is spelled out and marked up.
  await expect(page.getByText("Changes from version 1")).toBeVisible();
  await expect(page.getByText(/replacing worn-out cells/).first()).toBeVisible();

  // Version 1 stays fully readable, exactly as first shared.
  await page.getByRole("button", { name: /Version 1/ }).click();
  await expect(page.getByText("First shared by Ava Morgan").first()).toBeVisible();
  await expect(
    page.getByText(
      "Mitosis is ordinary cell division. One cell divides once and produces two identical daughter cells. The body uses it for growth and repair.",
      { exact: true },
    ),
  ).toBeVisible();
});
