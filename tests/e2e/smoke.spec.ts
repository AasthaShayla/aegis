import { test, expect } from "@playwright/test";

test("dashboard boots key-free and renders the map + HUD", async ({ page }) => {
  await page.goto("/");
  // Brand + a WebGL canvas mount (deck.gl / MapLibre).
  await expect(page.getByText("AEGIS").first()).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 30_000 });
  // The layer panel renders its groups.
  await expect(page.getByText("Layers").first()).toBeVisible();
});

test("health endpoint reports layer availability", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.layers.earthquakes).toBe(true);
});
