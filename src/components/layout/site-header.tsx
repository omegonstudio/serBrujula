import Link from "next/link";
import { getCartSummary } from "@/modules/cart/application/cart-service";
import { MobileNav } from "@/components/layout/mobile-nav";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/sobre", label: "Sobre" },
  { href: "/servicios", label: "Servicios" },
  { href: "/reservas", label: "Reservas" },
  { href: "/tienda", label: "Tienda" },
  { href: "/contacto", label: "Contacto" },
];

export async function SiteHeader() {
  const { itemCount } = await getCartSummary();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur-sm transition-colors">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-fraunces)] text-xl text-forest"
        >
          Ser Brújula
        </Link>
        <nav aria-label="Principal" className="hidden gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-stone transition-colors hover:text-forest"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/carrito"
            className="rounded-md border border-line px-3 py-2 text-sm text-ink hover:bg-sand"
          >
            Carrito{itemCount > 0 ? ` (${itemCount})` : ""}
          </Link>
          <MobileNav items={nav} />
        </div>
      </div>
    </header>
  );
}
