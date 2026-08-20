import { expect, test } from "@playwright/test";

test.describe("brand landing", () => {
  test("the brand hero leads and code entry still validates in place", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Many ideas. One shared knowledge base." }),
    ).toBeVisible();
    // The nav offers both paths: sign in and the dark get-started pill.
    await expect(page.getByRole("link", { name: "Get started" }).first()).toBeVisible();
    // The join path stays one anchor away, and the code validates in place.
    await expect(page.getByLabel("Enter class code")).toBeVisible();

    await page.getByLabel("Enter class code").fill("zzzzzz");
    await page.getByRole("button", { name: "Join Pot" }).click();
    await expect(
      page.getByText("We couldn't find that Pot. Check the code and try again."),
    ).toBeVisible();
    await expect(page.getByLabel("Enter class code")).toHaveValue("ZZZZZZ");
  });

  test("scrolling pins the melt and builds the organized note", async ({ page }) => {
    await page.goto("/");
    const stopper = page.getByTestId("scroll-stopper");
    const takeaway = page.getByText("The exam loves asking for ATP counts.");

    // Before scrolling, the organized card's pieces are hidden by the timeline.
    await expect(takeaway).not.toBeVisible();

    const stopperY = await stopper.evaluate(
      (el) => el.getBoundingClientRect().top + window.scrollY,
    );

    // Mid-scroll: the section is pinned (still on screen well past its top).
    await page.evaluate(({ y }) => window.scrollTo(0, y), { y: stopperY + 900 });
    await page.waitForTimeout(400);
    await expect(page.getByText("Rough thoughts go in. Real notes come out.")).toBeInViewport();
    await expect(page.getByRole("heading", { name: "How cells make ATP" })).toBeVisible();

    // Deep scroll: the whole organized note has melted in.
    await page.evaluate(({ y }) => window.scrollTo(0, y), { y: stopperY + 1680 });
    await page.waitForTimeout(400);
    await expect(takeaway).toBeVisible();
    await expect(page.getByText("Only you can approve what gets shared.")).toBeVisible();

    // Past the pin, the page continues to the steps section.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await expect(page.getByText("Start your class's Pot tonight.")).toBeVisible();
  });

  test("reduced motion gets the finished story with no pin", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    // Everything is readable immediately, no scroll choreography required.
    await expect(page.getByRole("heading", { name: "How cells make ATP" })).toBeVisible();
    await expect(page.getByText("The exam loves asking for ATP counts.")).toBeVisible();
    await expect(page.getByText("Only you can approve what gets shared.")).toBeVisible();
    await context.close();
  });
});
