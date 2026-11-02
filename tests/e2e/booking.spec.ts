import { test, expect } from "@playwright/test";

test("flujo de reserva hasta confirmación (modo manual)", async ({ page }) => {
  await page.goto("/reservas");
  await expect(page.getByRole("heading", { name: /reservar sesión/i })).toBeVisible();

  // Pick first service card
  await page.getByRole("button", { name: /masaje/i }).first().click();
  await page.getByRole("button", { name: /ver horarios disponibles/i }).click();

  // Wait for slots
  const slot = page.locator("button").filter({ hasText: /\d{2}:\d{2}/ }).first();
  await expect(slot).toBeVisible({ timeout: 15_000 });
  await slot.click();

  await page.getByLabel(/nombre completo/i).fill("Reservante Demo");
  await page.getByLabel(/^email$/i).fill("reserva.demo@example.com");
  await page.getByRole("button", { name: /reservar y pagar/i }).click();

  await expect(page).toHaveURL(/\/reserva\/.+\/pagar/, { timeout: 15_000 });
  await page.getByRole("button", { name: /simular pago aprobado/i }).click();
  await expect(page).toHaveURL(/\/reserva\/RV-/);
  await expect(page.getByText(/reserva confirmada/i)).toBeVisible();
});
