import { Container } from "@/components/ui/container";
import { getContentMap } from "@/modules/cms/application/content";

export const metadata = { title: "Sobre Ser Brújula" };

export default async function SobrePage() {
  const c = await getContentMap([
    "about.title",
    "about.story",
    "about.philosophy",
    "about.professional",
    "about.approach",
  ]);

  return (
    <Container className="space-y-12 py-16">
      <div>
        <h1 className="text-4xl text-ink">
          {c["about.title"] || "Sobre Ser Brújula"}
        </h1>
        <div className="mt-4 h-1 w-20 bg-clay" />
      </div>
      {[
        ["Historia", c["about.story"]],
        ["Filosofía", c["about.philosophy"]],
        ["Presentación profesional", c["about.professional"]],
        ["Enfoque de trabajo", c["about.approach"]],
      ].map(([title, body]) => (
        <section key={title as string} className="max-w-3xl">
          <h2 className="text-2xl text-ink">{title}</h2>
          <p className="mt-3 whitespace-pre-line text-stone">
            {(body as string) ||
              "Este texto se puede editar desde el panel de administración."}
          </p>
        </section>
      ))}
    </Container>
  );
}
