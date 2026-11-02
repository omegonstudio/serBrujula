import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { formatArs } from "@/lib/money";
import { getProductBySlug } from "@/modules/catalog/application/queries";
import { addToCartAction } from "@/modules/cart/application/actions";
import { AddToCartForm } from "@/components/shop/add-to-cart-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product?.name ?? "Producto" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const stock = product.inventory?.quantity ?? 0;
  const image = product.images[0]?.url;

  return (
    <Container className="grid gap-10 py-16 md:grid-cols-2">
      <div className="aspect-[4/5] overflow-hidden rounded-lg bg-sand">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-stone">
            Sin imagen
          </div>
        )}
      </div>
      <div>
        {product.category ? (
          <p className="text-sm uppercase tracking-wide text-stone">
            {product.category.name}
          </p>
        ) : null}
        <h1 className="mt-2 text-4xl text-ink">{product.name}</h1>
        <p className="mt-4 text-2xl text-forest">{formatArs(product.priceCents)}</p>
        <p className="mt-6 whitespace-pre-line text-stone">{product.description}</p>
        <p className="mt-4 text-sm text-stone">
          {stock > 0 ? `${stock} disponibles` : "Sin stock"}
        </p>
        {stock > 0 ? (
          <div className="mt-8">
            <AddToCartForm productId={product.id} action={addToCartAction} />
          </div>
        ) : (
          <Button type="button" disabled className="mt-8">
            Sin stock
          </Button>
        )}
      </div>
    </Container>
  );
}
