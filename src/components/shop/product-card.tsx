import Link from "next/link";
import { formatArs } from "@/lib/money";

type ProductCardProps = {
  slug: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
  stock?: number;
};

export function ProductCard({
  slug,
  name,
  priceCents,
  imageUrl,
  stock = 0,
}: ProductCardProps) {
  return (
    <Link
      href={`/tienda/${slug}`}
      className="group block overflow-hidden rounded-lg border border-line bg-cream transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone">
            Sin imagen
          </div>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h3 className="text-lg text-ink">{name}</h3>
        <p className="text-forest">{formatArs(priceCents)}</p>
        <p className="text-xs text-stone">
          {stock > 0 ? "Disponible" : "Sin stock"}
        </p>
      </div>
    </Link>
  );
}
