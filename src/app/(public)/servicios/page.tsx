import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getContentMap } from "@/modules/cms/application/content";

export const metadata = { title: "Servicios" };

export default async function ServiciosPage() {
  const c = await getContentMap([
    "services.intro",
    "services.office",
    "services.home",
    "services.cta",
  ]);

  return (
    <Container className="space-y-12 py-16">
      <div>
        <h1 className="text-4xl text-ink">Servicios</h1>
        <div className="mt-4 h-1 w-20 bg-clay" />
        <p className="mt-6 max-w-2xl text-lg text-stone">
          {c["services.intro"] ||
            "Masajes y sesiones de acompañamiento. La reserva online se habilitará en la etapa 2."}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-lg border border-line bg-cream p-6">
          <h2 className="text-2xl text-ink">Consultorio</h2>
          <p className="mt-3 text-stone">
            {c["services.office"] ||
              "Atención presencial en un espacio cuidado para escuchar al cuerpo."}
          </p>
        </article>
        <article className="rounded-lg border border-line bg-cream p-6">
          <h2 className="text-2xl text-ink">Domicilio</h2>
          <p className="mt-3 text-stone">
            {c["services.home"] ||
              "Sesiones a domicilio según zona de cobertura y disponibilidad."}
          </p>
        </article>
      </div>
      <div className="rounded-lg bg-sand p-6">
        <p className="text-ink">
          {c["services.cta"] ||
            "Reservá online tu sesión o escribinos si preferís consultar antes."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/reservas"
            className="inline-flex rounded-md bg-forest px-4 py-2.5 text-cream hover:bg-sage"
          >
            Reservar online
          </Link>
          <Link
            href="/contacto"
            className="inline-flex rounded-md border border-forest px-4 py-2.5 text-forest hover:bg-cream"
          >
            Consultar
          </Link>
        </div>
      </div>
    </Container>
  );
}
