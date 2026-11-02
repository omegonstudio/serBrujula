import { test, expect } from "@playwright/test";

test("home page loads brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /cuerpo como brújula/i })).toBeVisible();
});

test("admin login page is reachable", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: /administración/i })).toBeVisible();
});
