import { AppError } from "@/lib/errors";

export type SiteMode = "full" | "presentation";

export const PRESENTATION_COMMERCE_MESSAGE =
  "Este entorno es de demostración. Las compras y pagos no están habilitados.";

export type PublicNavItem = { href: string; label: string };

const FULL_NAV: PublicNavItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/sobre", label: "Sobre" },
  { href: "/servicios", label: "Servicios" },
  { href: "/reservas", label: "Reservas" },
  { href: "/tienda", label: "Tienda" },
  { href: "/contacto", label: "Contacto" },
];

/** Reads NEXT_PUBLIC_SITE_MODE. Default: full. */
export function getSiteMode(): SiteMode {
  const raw = (process.env.NEXT_PUBLIC_SITE_MODE ?? "full").trim().toLowerCase();
  return raw === "presentation" ? "presentation" : "full";
}

export function isPresentationMode(): boolean {
  return getSiteMode() === "presentation";
}

/** Public nav for the current mode (hides booking in presentation). */
export function getPublicNavItems(): PublicNavItem[] {
  if (!isPresentationMode()) return FULL_NAV;
  return FULL_NAV.filter((item) => item.href !== "/reservas");
}

/** CTA primario de reservas en superficies públicas (p. ej. /servicios). */
export function getPublicBookingCta(): PublicNavItem | null {
  if (isPresentationMode()) return null;
  return { href: "/reservas", label: "Reservar online" };
}

/**
 * Server-side gate for economic operations (orders, preferences, manual pay, bookings).
 * UI hiding alone is not sufficient — call from Server Actions / Route Handlers.
 */
export function assertCommerceEnabled(): void {
  if (isPresentationMode()) {
    throw new AppError("FORBIDDEN", PRESENTATION_COMMERCE_MESSAGE, {
      status: 403,
    });
  }
}
