import { requireAdmin } from "@/modules/identity/application/require-admin";
import { listContents } from "@/modules/cms/application/content";
import { saveContentAction } from "@/modules/cms/application/actions";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Contenidos" };

const editableKeys = [
  "home.hero.title",
  "home.hero.subtitle",
  "home.services.intro",
  "home.about.teaser",
  "brand.tagline",
  "about.title",
  "about.story",
  "about.philosophy",
  "about.professional",
  "about.approach",
  "services.intro",
  "services.office",
  "services.home",
  "services.cta",
  "contact.email",
  "contact.intro",
  "shipping.flatCents",
];

export default async function AdminContenidosPage() {
  await requireAdmin();
  const existing = await listContents();
  const map = Object.fromEntries(existing.map((c) => [c.key, c.value]));

  return (
    <Container className="space-y-6 py-10">
      <div>
        <h1 className="text-3xl text-ink">Contenidos</h1>
        <p className="text-stone">
          Textos e imágenes de la web. `shipping.flatCents` es el costo de envío
          en centavos (ej. 250000 = $2.500).
        </p>
      </div>
      <div className="space-y-6">
        {editableKeys.map((key) => (
          <form
            key={key}
            action={saveContentAction}
            className="rounded-lg border border-line bg-cream p-4"
          >
            <input type="hidden" name="key" value={key} />
            <Label>
              {key}
              {key.includes("email") || key.includes("Cents") || key.includes("title") ? (
                <Input name="value" defaultValue={map[key] ?? ""} className="mt-1" />
              ) : (
                <Textarea
                  name="value"
                  rows={4}
                  defaultValue={map[key] ?? ""}
                  className="mt-1"
                />
              )}
            </Label>
            <Button type="submit" size="sm" className="mt-3" variant="outline">
              Guardar
            </Button>
          </form>
        ))}
      </div>
    </Container>
  );
}
