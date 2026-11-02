import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductCard } from "@/components/shop/product-card";
import { getContentMap } from "@/modules/cms/application/content";
import { listPublicProducts } from "@/modules/catalog/application/queries";

export default async function HomePage() {
  const content = await getContentMap([
    "home.hero.title",
    "home.hero.subtitle",
    "home.services.intro",
    "home.about.teaser",
    "brand.tagline",
  ]);
  const featured = await listPublicProducts({ featuredOnly: true });

  return (
    <div>
      <section className="relative min-h-[78vh] bg-forest px-4 py-24 text-cream sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-clay">
            Ser Brújula
          </p>
          <h1 className="mb-6 text-4xl leading-tight md:text-6xl">
            {content["home.hero.title"] || "El cuerpo como brújula"}
          </h1>
          <p className="mb-10 max-w-xl text-lg text-sand">
            {content["home.hero.subtitle"] ||
              "Un espacio de autoconocimiento, aceptación y conexión con el cuerpo."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/tienda"
              className="rounded-md bg-clay px-5 py-3 text-ink transition-colors hover:bg-sand"
            >
              Explorar la tienda
            </Link>
            <Link
              href="/servicios"
              className="rounded-md border border-cream/40 px-5 py-3 text-cream transition-colors hover:bg-cream/10"
            >
              Ver servicios
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <Container className="space-y-10">
          <SectionHeading
            title="Servicios"
            subtitle={
              content["home.services.intro"] ||
              "Masajes y acompañamientos para volver al cuerpo con presencia."
            }
          />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-line bg-sand/50 p-6">
              <h3 className="text-xl text-ink">Masajes</h3>
              <p className="mt-2 text-stone">
                Sesiones presenciales en consultorio o a domicilio. La reserva
                online llega en la próxima etapa; por ahora podés consultar por
                contacto.
              </p>
              <Link href="/servicios" className="mt-4 inline-block text-forest underline-offset-2 hover:underline">
                Conocer modalidades
              </Link>
            </div>
            <div className="rounded-lg border border-line bg-sand/50 p-6">
              <h3 className="text-xl text-ink">Autocuidado</h3>
              <p className="mt-2 text-stone">
                Productos y prácticas para acompañar el proceso entre sesiones.
              </p>
              <Link href="/tienda" className="mt-4 inline-block text-forest underline-offset-2 hover:underline">
                Ir a la tienda
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-sand/60 py-20">
        <Container className="space-y-10">
          <SectionHeading
            title="Selección de la tienda"
            subtitle="Productos de autocuidado y cosmética natural."
          />
          {featured.length === 0 ? (
            <p className="text-stone">Pronto vas a encontrar productos aquí.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.slice(0, 3).map((p) => (
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
          <Link
            href="/tienda"
            className="inline-flex rounded-md bg-forest px-4 py-2.5 text-cream hover:bg-sage"
          >
            Ver toda la tienda
          </Link>
        </Container>
      </section>

      <section className="py-20">
        <Container className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <SectionHeading
              title="La profesional"
              subtitle={
                content["home.about.teaser"] ||
                "Un acompañamiento cercano, profesional y conectado con la naturaleza del cuerpo."
              }
            />
            <Link
              href="/sobre"
              className="mt-6 inline-block text-forest underline-offset-2 hover:underline"
            >
              Leer más
            </Link>
          </div>
          <div className="min-h-64 rounded-lg bg-forest/90 p-8 text-cream">
            <p className="font-[family-name:var(--font-fraunces)] text-2xl">
              {content["brand.tagline"] || "Orientación, intuición y presencia."}
            </p>
          </div>
        </Container>
      </section>
    </div>
  );
}
