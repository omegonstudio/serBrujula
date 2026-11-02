import { test, expect } from "@playwright/test";

test("flujo de compra hasta confirmación de pago (modo manual)", async ({
  page,
}) => {
  await page.goto("/tienda");
  await expect(page.getByRole("heading", { name: /tienda/i })).toBeVisible();

  const firstProduct = page.locator("a[href^='/tienda/']").first();
  await firstProduct.click();

  await expect(page.getByRole("button", { name: /agregar al carrito/i })).toBeVisible();
  await page.getByRole("button", { name: /agregar al carrito/i }).click();
  await expect(page).toHaveURL(/\/carrito/);

  await page.getByRole("link", { name: /continuar al checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);

  await page.getByLabel(/nombre completo/i).fill("Cliente Demo");
  await page.getByLabel(/^email$/i).fill("cliente.demo@example.com");
  await page.getByLabel(/teléfono/i).fill("1112345678");
  await page.getByRole("button", { name: /confirmar y pagar/i }).click();

  await expect(page).toHaveURL(/\/pedido\/.+\/pagar/);
  await page.getByRole("button", { name: /simular pago aprobado/i }).click();

  await expect(page).toHaveURL(/\/pedido\/SB-/);
  await expect(page.getByText(/pago confirmado/i)).toBeVisible();
});
