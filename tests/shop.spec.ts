import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const product = {
  id: "luma",
  name: "Luma",
  priceCents: 4900,
  currency: "USD",
  colours: [
    { name: "terracotta", label: "Terracotta", hex: "#E87945" },
    { name: "sage", label: "Sage", hex: "#92A18C" },
    { name: "charcoal", label: "Charcoal", hex: "#40464A" },
  ],
};
const orders = ["amina", "omar", "sara", "lina", "adam", "youssef"].map(
  (name, index) => ({
    id: 1006 - index,
    productId: "luma",
    email: `${name}@example.com`,
    colour: [
      "terracotta",
      "sage",
      "charcoal",
      "sage",
      "terracotta",
      "charcoal",
    ][index],
    quantity: [1, 2, 1, 1, 3, 2][index],
    unitPriceCents: 4900,
    totalCents: [1, 2, 1, 1, 3, 2][index] * 4900,
    createdAt: `2026-01-0${6 - index}T12:00:00.000Z`,
  }),
);

test.beforeEach(async ({ page }) => {
  await page.route("**/api/products", (route) =>
    route.fulfill({ json: [product] }),
  );
  await page.route("**/api/orders?*", (route) => {
    const number = Number(
      new URL(route.request().url()).searchParams.get("page"),
    );
    return route.fulfill({
      json: {
        items: orders.slice((number - 1) * 3, number * 3),
        total: 6,
        page: number,
        pageSize: 3,
      },
    });
  });
});

test("shop colour, total, validation, saving guard, failure and successful navigation", async ({
  page,
}) => {
  await page.goto("/");
  const form = page.locator("form");
  await form.getByRole("button", { name: "Sage", exact: true }).click();
  await expect(
    page.getByRole("group", { name: "Luma desk lamp in sage" }),
  ).toBeVisible();
  await expect(
    form.getByRole("button", { name: "Sage", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Quantity", { exact: true }).selectOption("2");
  await expect(page.getByLabel("Order total")).toHaveText("$98");
  await form.getByRole("button", { name: "Place demo order" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await page.getByLabel("Your email").fill("demo@example.com");
  let calls = 0;
  await page.route("**/api/orders", async (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({
      productId: "luma",
      email: "demo@example.com",
      colour: "sage",
      quantity: 2,
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill(
      calls === 1
        ? { status: 500, json: { error: "Could not save. Try again." } }
        : { status: 201, json: { ...orders[0], id: 1007 } },
    );
  });
  await form.getByRole("button", { name: "Place demo order" }).click();
  await expect(
    form.getByRole("button", { name: "Saving your order…" }),
  ).toBeDisabled();
  await expect(page.getByText("Could not save. Try again.")).toBeVisible();
  await expect(page.getByLabel("Your email")).toHaveValue("demo@example.com");
  await form.getByRole("button", { name: "Place demo order" }).click();
  await expect(page.getByText("#1007", { exact: true })).toBeVisible();
  expect(calls).toBe(2);
  await page.getByRole("link", { name: "View your order" }).click();
  await expect(
    page.getByRole("cell", { name: "amina@example.com" }),
  ).toBeVisible();
});

test("table pages, card lazy loading and view reset", async ({ page }) => {
  const requests: number[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/orders?"))
      requests.push(Number(new URL(request.url()).searchParams.get("page")));
  });
  await page.goto("/orders");
  await expect(page.getByText("Showing 1–3 of 6")).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Showing 4–6 of 6")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(page.locator(".order-card")).toHaveCount(3);
  expect(requests.at(-1)).toBe(1);
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(page.locator(".order-card")).toHaveCount(6);
  await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
  expect(requests.at(-1)).toBe(2);
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(page.getByText("Showing 1–3 of 6")).toBeVisible();
});

test("failed initial and next page retry preserve cards and retry the same page", async ({
  page,
}) => {
  const calls = new Map<number, number>();
  let failInitial = true;
  await page.route("**/api/orders?*", (route) => {
    const number = Number(
      new URL(route.request().url()).searchParams.get("page"),
    );
    calls.set(number, (calls.get(number) || 0) + 1);
    return route.fulfill(
      (number === 1 ? failInitial : calls.get(number) === 1)
        ? { status: 500, json: { error: "Temporary interruption." } }
        : {
            json: {
              items: orders.slice((number - 1) * 3, number * 3),
              total: 6,
              page: number,
              pageSize: 3,
            },
          },
    );
  });
  await page.goto("/orders");
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    "Temporary interruption.",
  );
  failInitial = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(page.locator(".order-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(page.locator(".order-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Retry failed page" }).click();
  await expect(page.locator(".order-card")).toHaveCount(6);
  expect(calls.get(2)).toBe(2);
});

test("stale responses cannot replace a newer view; returning from shop fetches fresh data", async ({
  page,
}) => {
  let count = 0;
  await page.route("**/api/orders?*", async (route) => {
    count++;
    const current = count;
    await new Promise((resolve) =>
      setTimeout(resolve, current === 1 ? 500 : 20),
    );
    await route.fulfill({
      json: {
        items: current === 1 ? orders.slice(3) : orders.slice(0, 3),
        total: 6,
        page: 1,
        pageSize: 3,
      },
    });
  });
  await page.goto("/orders");
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(page.locator(".order-card").first()).toContainText("#1006");
  await page.waitForTimeout(600);
  await expect(page.locator(".order-card").first()).toContainText("#1006");
  const before = count;
  await page.getByRole("link", { name: "Back to shop" }).click();
  await expect(
    page.getByRole("heading", { name: "A little light. A better mood." }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Orders" })
    .click();
  await expect(page.locator("tbody tr, .order-card").first()).toContainText(
    "#1006",
  );
  await expect.poll(() => count).toBeGreaterThan(before);
});

test("empty orders and product failure have clear recovery paths", async ({
  page,
}) => {
  await page.route("**/api/orders?*", (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 3 } }),
  );
  await page.goto("/orders");
  await expect(page.getByText("No orders yet")).toBeVisible();
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(page.getByText("No orders yet")).toBeVisible();
  await page.route("**/api/products", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Unable to reach the shop",
  );
  await page.unroute("**/api/products");
  await page.route("**/api/products", (route) =>
    route.fulfill({ json: [product] }),
  );
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByLabel("Your email")).toBeVisible();
});

test("mobile, keyboard, reduced motion and submission screenshots", async ({
  page,
}) => {
  await mkdir("docs/screenshots", { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByLabel("Your email")).toBeVisible();
  await expect(page.locator(".lamp-canvas")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  await expect(page.locator(".lamp-loading")).toHaveCount(0);
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.screenshot({
    path: "docs/screenshots/shop-desktop.png",
    fullPage: true,
  });
  await page
    .locator("form")
    .getByRole("button", { name: "Sage", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("group", { name: "Luma desk lamp in sage" }),
  ).toBeVisible();
  expect(
    await page
      .locator(".hero h1")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator(".lamp-canvas")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.addStyleTag({ content: ".skip-link { display: none !important; }" });
  await page.screenshot({
    path: "docs/screenshots/shop-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/orders");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".table-scroll")
      .evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: "docs/screenshots/orders-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cards", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".order-card")).toHaveCount(3);
  expect(
    await page
      .locator(".order-cards")
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      ),
  ).toBe(1);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "docs/screenshots/orders-cards.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.screenshot({
    path: "docs/screenshots/orders-table.png",
    fullPage: true,
  });
});
