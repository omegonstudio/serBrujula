import Link from "next/link";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatArs } from "@/lib/money";
import { getCartSummary } from "@/modules/cart/application/cart-service";
import { updateCartItemAction } from "@/modules/cart/application/actions";

export const metadata = { title: "Carrito" };

export default async function CarritoPage() {
  const { items, subtotalCents } = await getCartSummary();

  return (
    <Container className="space-y-8 py-16">
      <div>
        <h1 className="text-4xl text-ink">Carrito</h1>
        <div className="mt-4 h-1 w-20 bg-clay" />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Tu carrito está vacío"
          description="Explorá la tienda para sumar productos."
        />
      ) : (
        <div className="space-y-6">
          <ul className="divide-y divide-line rounded-lg border border-line bg-cream">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link
                    href={`/tienda/${item.product.slug}`}
                    className="text-lg text-ink hover:text-forest"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-stone">
                    {formatArs(item.product.priceCents)} c/u
                  </p>
                </div>
                <form
                  action={updateCartItemAction}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="itemId" value={item.id} />
                  <Input
                    name="quantity"
                    type="number"
                    min={0}
                    defaultValue={item.quantity}
                    className="w-20"
                  />
                  <Button type="submit" variant="outline" size="sm">
                    Actualizar
                  </Button>
                </form>
                <p className="font-medium text-ink">
                  {formatArs(item.product.priceCents * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xl text-ink">
              Subtotal: <strong>{formatArs(subtotalCents)}</strong>
            </p>
            <Link
              href="/checkout"
              className="rounded-md bg-forest px-5 py-3 text-cream hover:bg-sage"
            >
              Continuar al checkout
            </Link>
          </div>
        </div>
      )}
    </Container>
  );
}
