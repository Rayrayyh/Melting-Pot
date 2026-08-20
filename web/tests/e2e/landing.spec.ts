import { expect, test, type Page } from "@playwright/test";

/** Waits for the scroll position to stop moving, however it is being driven. */
async function settleScroll(page: Page) {
  let last = Number.NaN;
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => window.scrollY);
    if (Math.abs(y - last) < 0.5) return;
    last = y;
    await page.waitForTimeout(50);
  }
}

test.describe("brand landing", () => {
  test("the brand hero leads and code entry still validates in place", async ({ page }) => {
    await page.goto("/");
    // Lenis marks the root when it is running; without this a dynamic import
    // that silently failed would still pass every other assertion here.
    await expect(page.locator("html")).toHaveClass(/(^|\s)lenis(\s|$)/);
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

  // The header once collided with itself on a phone: the wordmark and the nav
  // met at zero gap, both labels wrapped inside fixed-height controls, and the
  // page scrolled sideways. A student arriving from a text message sees this
  // header first, so it is held to a test.
  for (const width of [320, 360, 375, 414]) {
    test(`the header holds together at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto("/");

      // Nothing scrolls sideways.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);

      // Both account controls stay on one line, inside their own boxes.
      const signIn = page.getByRole("link", { name: "Sign in" });
      const pill = page.locator("header nav a").last();
      await expect(signIn).toBeVisible();
      await expect(pill).toBeVisible();
      expect((await signIn.boundingBox())!.height).toBeLessThan(30);
      expect((await pill.boundingBox())!.height).toBeLessThanOrEqual(44);

      // The mark and the nav never touch.
      const markBox = (await page.locator("header a").first().boundingBox())!;
      const navBox = (await page.locator("header nav").boundingBox())!;
      expect(navBox.x - (markBox.x + markBox.width)).toBeGreaterThanOrEqual(8);
    });
  }

  test("anchors scroll to their sections, including back up past the pin", async ({ page }) => {
    await page.goto("/");

    // A bare <a> in the header.
    await page.getByRole("link", { name: "Spaces" }).click();
    await settleScroll(page);
    await expect(
      page.getByRole("heading", { name: "Everything your class knows, in one Pot." }),
    ).toBeInViewport();

    // The hero call to action is a next/link, not an <a>. Same behaviour.
    await page.evaluate(() => window.scrollTo(0, 0));
    await settleScroll(page);
    await page.getByRole("link", { name: "Get started" }).last().click();
    await settleScroll(page);
    await expect(page.getByLabel("Enter class code")).toBeInViewport();

    // Upward, past the pinned melt, from the closing card.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await settleScroll(page);
    await page.getByRole("link", { name: "or enter a class code" }).click();
    await settleScroll(page);
    await expect(page.getByLabel("Enter class code")).toBeInViewport();
  });

  // Lenis overwrites the browser's own scroll for about 0.9s after a wheel
  // notch unless it is reconciled. That window swallowing a keypress is a
  // keyboard accessibility failure, and it is the thing most likely to
  // silently come back.
  test("a keypress mid-scroll is not swallowed", async ({ page }) => {
    await page.goto("/");
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(80);
    await page.keyboard.press("PageDown");
    await settleScroll(page);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
  });

  test("reduced motion gets the finished story with no pin", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    // Smooth scroll is never constructed under the preference, not merely
    // constructed and disabled.
    await expect(page.locator("html")).not.toHaveClass(/(^|\s)lenis(\s|$)/);

    // Everything is readable immediately, no scroll choreography required.
    await expect(page.getByRole("heading", { name: "How cells make ATP" })).toBeVisible();
    await expect(page.getByText("The exam loves asking for ATP counts.")).toBeVisible();
    await expect(page.getByText("Only you can approve what gets shared.")).toBeVisible();
    await context.close();
  });
});
