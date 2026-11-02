import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/components/shop/product-card";
import { Input } from "@/components/ui/input";
import {
  listCategories,
  listPublicProducts,
} from "@/modules/catalog/application/queries";
import Link from "next/link";

export const metadata = { title: "Tienda" };

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>;
}) {
  const params = await searchParams;
  const [products, categories] = await Promise.all([
    listPublicProducts({
      q: params.q,
      categorySlug: params.categoria,
    }),
    listCategories(),
  ]);

  return (
    <Container className="space-y-10 py-16">
      <div>
        <h1 className="text-4xl text-ink">Tienda</h1>
        <div className="mt-4 h-1 w-20 bg-clay" />
        <p className="mt-4 max-w-2xl text-stone">
          Productos de autocuidado seleccionados para acompañar tu proceso.
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          Buscar
          <Input
            name="q"
            defaultValue={params.q}
            placeholder="Aceite, crema..."
            className="mt-1"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-forest px-4 py-2.5 text-sm text-cream hover:bg-sage"
        >
          Buscar
        </button>
      </form>

      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/tienda"
            className={`rounded-md px-3 py-1.5 text-sm ${
              !params.categoria ? "bg-forest text-cream" : "bg-sand text-ink"
            }`}
          >
            Todas
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/tienda?categoria=${cat.slug}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                params.categoria === cat.slug
                  ? "bg-forest text-cream"
                  : "bg-sand text-ink"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      ) : null}

      {products.length === 0 ? (
        <EmptyState
          title="No hay productos para mostrar"
          description="Probá otra búsqueda o volvé más tarde."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              slug={p.slug}
              name={p.name}
              priceCents={p.priceCents}
              imageUrl={p.images[0]?.url}
              stock={p.inventory?.quantity ?? 0}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
