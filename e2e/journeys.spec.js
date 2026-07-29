// Full-browser journeys. In demo mode these verify the whole app in a real
// browser; with .env configured they exercise your LIVE Supabase, including
// the cross-DEVICE realtime test no jsdom suite can cover.
import { test, expect } from "@playwright/test";

test("customer orders and kitchen sees it live (two browser pages)", async ({ browser }) => {
  const customer = await (await browser.newContext()).newPage();
  const owner = await (await browser.newContext()).newPage();

  // owner opens the live board first
  await owner.goto("/login");
  await owner.getByText("Continue to demo").click();
  await owner.goto("/app/orders/live");

  // customer orders
  await customer.goto("/r/spice-junction");
  await customer.getByRole("button", { name: /ADD/i }).first().click();
  await customer.getByText(/View cart/i).click();
  await customer.getByPlaceholder("e.g. Aarav").fill("Playwright");
  await customer.getByPlaceholder("+91…").fill("+91 90000 00002");
  await customer.getByText(/Place order/i).click();
  await expect(customer.getByText(/Your token number/i)).toBeVisible();

  // the order streams onto the owner's OPEN board (realtime in remote mode)
  await expect(owner.getByText("Playwright").first()).toBeVisible({ timeout: 15000 });
});

test("order status survives a page refresh", async ({ page }) => {
  // print the app's [GrOrbit] breadcrumbs into the test output on failure
  page.on("console", (m) => { if (m.text().includes("[GrOrbit]")) console.log("  app:", m.text()); });
  await page.goto("/r/spice-junction");
  await page.getByRole("button", { name: /ADD/i }).first().click();
  await page.getByText(/View cart/i).click();
  await page.getByText(/Place order/i).click();
  await expect(page.getByText(/Your token number/i)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Your token number/i)).toBeVisible({ timeout: 15000 });
});

test("auth gate + weak password rejected", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByText(/^Welcome back$/)).toBeVisible();
  await page.getByText("Create an account").click();
  await page.getByPlaceholder("Your name").fill("Test");
  await page.getByPlaceholder("Email").fill("weak@test.in");
  await page.getByPlaceholder("Password").fill("abc");
  await page.getByText("Create account").click();
  await expect(page.getByText(/Password needs/i)).toBeVisible();
});

test("QR page renders a real scannable SVG", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("Continue to demo").click();
  await page.goto("/app/qr");
  await expect(page.getByTestId("main-qr").locator("svg")).toBeVisible({ timeout: 10000 });
});
