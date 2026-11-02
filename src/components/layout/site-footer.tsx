import Link from "next/link";
import { Container } from "@/components/ui/container";

export function SiteFooter({
  contactEmail,
}: {
  contactEmail?: string;
}) {
  return (
    <footer className="border-t border-line bg-sand">
      <Container className="grid gap-8 py-12 md:grid-cols-3">
        <div>
          <p className="font-[family-name:var(--font-fraunces)] text-lg text-ink">
            Ser Brújula
          </p>
          <p className="mt-2 text-sm text-stone">El cuerpo como brújula.</p>
        </div>
        <div className="text-sm text-stone">
          <p className="mb-2 font-medium text-ink">Explorar</p>
          <ul className="space-y-1">
            <li>
              <Link href="/sobre" className="hover:text-forest">
                Sobre
              </Link>
            </li>
            <li>
              <Link href="/servicios" className="hover:text-forest">
                Servicios
              </Link>
            </li>
            <li>
              <Link href="/tienda" className="hover:text-forest">
                Tienda
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm text-stone">
          <p className="mb-2 font-medium text-ink">Contacto</p>
          {contactEmail ? <p>{contactEmail}</p> : null}
          <Link href="/contacto" className="hover:text-forest">
            Escribinos
          </Link>
        </div>
      </Container>
    </footer>
  );
}
