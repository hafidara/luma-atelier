import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const requireFromRoot = createRequire(join(process.cwd(), "package.json"));
const { createApp } = requireFromRoot("./apps/api/dist/app.js");

test("browser submits to real Nest API and the saved order appears first", async ({
  page,
}) => {
  const directory = await mkdtemp(join(tmpdir(), "luma-browser-test-"));
  process.env.DATA_DIR = directory;
  const app = await createApp();
  try {
    await app.listen(0, "127.0.0.1");
    const apiUrl = await app.getUrl();
    // Redirect only the port; requests still reach the real API and its JSON storage.
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({
        url: `${apiUrl}${url.pathname}${url.search}`,
      });
      await route.fulfill({ response });
    });
    await page.goto("/");
    await page.getByLabel("Your email").fill("browser@example.com");
    await page.getByLabel("Quantity", { exact: true }).selectOption("2");
    await expect(page.getByLabel("Order total")).toHaveText("$98");
    await page.getByRole("button", { name: "Place demo order" }).click();
    await expect(page.getByText("#1007", { exact: true })).toBeVisible();
    const saved = JSON.parse(
      await readFile(join(directory, "orders.json"), "utf8"),
    );
    expect(saved).toHaveLength(7);
    expect(
      saved.find((order: { id: number }) => order.id === 1007).totalCents,
    ).toBe(9800);
    await page.getByRole("link", { name: "View your order" }).click();
    await expect(page.locator("tbody tr").first()).toContainText("#1007");
    await expect(page.locator("tbody tr").first()).toContainText(
      "browser@example.com",
    );
    const cors = await fetch(`${apiUrl}/api/products`, {
      headers: { Origin: "http://127.0.0.1:3000" },
    });
    expect(cors.headers.get("access-control-allow-origin")).toBe(
      "http://127.0.0.1:3000",
    );
  } finally {
    await app.close();
    delete process.env.DATA_DIR;
    await rm(directory, { recursive: true, force: true });
  }
});
