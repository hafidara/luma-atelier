import { test, expect } from "@playwright/test";

test("GLB loads, recolours and rotates; context loss preserves ordering", async ({
  page,
}) => {
  const errors: string[] = [];
  let releaseModel!: () => void;
  const modelGate = new Promise<void>((resolve) => {
    releaseModel = resolve;
  });
  await page.route("**/assets/Lampa.glb", async (route) => {
    await modelGate;
    await route.continue();
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/products", (route) =>
    route.fulfill({
      json: [
        {
          id: "luma",
          name: "Luma",
          priceCents: 4900,
          currency: "USD",
          colours: [
            { name: "terracotta", label: "Terracotta", hex: "#E87945" },
            { name: "sage", label: "Sage", hex: "#92A18C" },
            { name: "charcoal", label: "Charcoal", hex: "#40464A" },
          ],
        },
      ],
    }),
  );
  await page.goto("/");
  const canvas = page.locator(".lamp-canvas");
  try {
    await expect(page.locator(".lamp-loading")).toBeVisible();
    await expect(page.locator(".lamp-fallback")).toHaveCount(0);
  } finally {
    releaseModel();
  }
  await expect(canvas).toHaveAttribute("data-ready", "true", {
    timeout: 20000,
  });
  await expect(page.locator(".lamp-fallback")).toBeHidden();
  await expect(page.locator(".lamp-loading")).toHaveCount(0);
  const before = await canvas.screenshot();
  await page
    .locator("form")
    .getByRole("button", { name: "Sage", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Luma desk lamp in sage" }),
  ).toBeVisible();
  const sage = await canvas.screenshot();
  expect(sage.equals(before)).toBe(false);
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  expect((await canvas.screenshot()).equals(sage)).toBe(false);
  await page.keyboard.press("ArrowUp");
  const tilted = await canvas.screenshot();
  for (let step = 0; step < 20; step++) await page.keyboard.press("ArrowUp");
  const topLimit = await canvas.screenshot();
  expect(topLimit.equals(tilted)).toBe(false);
  await page.keyboard.press("ArrowUp");
  expect((await canvas.screenshot()).equals(topLimit)).toBe(true);
  for (let step = 0; step < 20; step++) await page.keyboard.press("ArrowRight");
  const sideLimit = await canvas.screenshot();
  await page.keyboard.press("ArrowRight");
  expect((await canvas.screenshot()).equals(sideLimit)).toBe(true);
  await canvas.blur();
  await page.screenshot({
    path: "docs/screenshots/lamp-3d.png",
    fullPage: true,
  });
  await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await expect(canvas).toHaveAttribute("data-ready", "false");
  await expect(page.locator(".lamp-fallback")).toBeVisible();
  await expect(page.locator(".lamp-loading")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Place demo order" }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});

test("missing model keeps the static colour-responsive fallback", async ({
  page,
}) => {
  await page.route("**/assets/Lampa.glb", (route) =>
    route.fulfill({ status: 404 }),
  );
  const failedAsset = page.waitForResponse("**/assets/Lampa.glb");
  await page.goto("/");
  await failedAsset;
  await expect(page.locator(".lamp-fallback")).toBeVisible();
  await expect(page.locator(".lamp-canvas")).not.toHaveAttribute(
    "data-ready",
    "true",
  );
});
