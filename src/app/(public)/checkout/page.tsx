import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatArs } from "@/lib/money";
import { getCartSummary } from "@/modules/cart/application/cart-service";
import { getContent } from "@/modules/cms/application/content";
import { checkoutAction } from "@/modules/checkout/application/actions";
import { CheckoutFulfillmentFields } from "@/components/shop/checkout-fulfillment-fields";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { items, subtotalCents } = await getCartSummary();
  if (items.length === 0) redirect("/carrito");

  const shippingCents = Number(await getContent("shipping.flatCents", "250000")) || 0;

  return (
    <Container className="grid gap-10 py-16 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <h1 className="text-4xl text-ink">Checkout</h1>
        <div className="mt-4 h-1 w-20 bg-clay" />
        {params.error ? (
          <Alert variant="error" className="mt-6">
            {params.error}
          </Alert>
        ) : null}
        {!process.env.MERCADOPAGO_ACCESS_TOKEN ? (
          <Alert className="mt-6">
            Mercado Pago no está configurado. El checkout usará el modo de
            confirmación manual de desarrollo (no apto para producción).
          </Alert>
        ) : null}
        <form action={checkoutAction} className="mt-8 space-y-4">
          <Label>
            Nombre completo
            <Input name="fullName" required autoComplete="name" />
          </Label>
          <Label>
            Email
            <Input name="email" type="email" required autoComplete="email" />
          </Label>
          <Label>
            Teléfono
            <Input name="phone" type="tel" autoComplete="tel" />
          </Label>
          <CheckoutFulfillmentFields shippingCents={shippingCents} />
          <Label>
            Notas
            <Textarea name="notes" rows={3} />
          </Label>
          <Button type="submit" size="lg">
            Confirmar y pagar
          </Button>
        </form>
      </div>
      <aside className="h-fit rounded-lg border border-line bg-sand/50 p-6">
        <h2 className="text-xl text-ink">Resumen</h2>
        <ul className="mt-4 space-y-2 text-sm text-stone">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span>
                {item.product.name} × {item.quantity}
              </span>
              <span>{formatArs(item.product.priceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line pt-4 text-ink">
          Subtotal: {formatArs(subtotalCents)}
        </p>
        <p className="text-sm text-stone">
          Envío: se calcula según la opción elegida ({formatArs(shippingCents)}{" "}
          si corresponde).
        </p>
      </aside>
    </Container>
  );
}
