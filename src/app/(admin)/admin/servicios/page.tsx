import { requireAdmin } from "@/modules/identity/application/require-admin";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatArs } from "@/lib/money";
import {
  upsertLocationAction,
  upsertServiceAction,
} from "@/modules/booking/application/actions";

export const metadata = { title: "Servicios" };

export default async function AdminServiciosPage() {
  await requireAdmin();
  const [services, locations] = await Promise.all([
    prisma.service.findMany({
      include: { offerings: { include: { location: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.serviceLocation.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <Container className="space-y-10 py-10">
      <h1 className="text-3xl text-ink">Servicios y modalidades</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        <form action={upsertServiceAction} className="space-y-3 rounded-lg border border-line bg-cream p-5">
          <h2 className="text-xl">Nuevo servicio</h2>
          <Label>
            Nombre
            <Input name="name" required />
          </Label>
          <Label>
            Descripción
            <Textarea name="description" required rows={3} />
          </Label>
          <Label>
            Duración (min)
            <Input name="durationMinutes" type="number" defaultValue={60} required />
          </Label>
          <Label>
            Buffer antes (min)
            <Input name="bufferBeforeMinutes" type="number" defaultValue={0} />
          </Label>
          <Label>
            Buffer después (min)
            <Input name="bufferAfterMinutes" type="number" defaultValue={15} />
          </Label>
          <Label>
            Precio (centavos)
            <Input name="priceCents" type="number" required placeholder="1500000" />
          </Label>
          <fieldset className="space-y-1 text-sm">
            <legend>Modalidades</legend>
            {locations.map((loc) => (
              <label key={loc.id} className="flex items-center gap-2">
                <input type="checkbox" name="locationIds" value={loc.id} />
                {loc.name} ({loc.type})
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked /> Activo
          </label>
          <Button type="submit">Guardar servicio</Button>
        </form>

        <form action={upsertLocationAction} className="space-y-3 rounded-lg border border-line bg-cream p-5">
          <h2 className="text-xl">Nueva ubicación</h2>
          <Label>
            Nombre
            <Input name="name" required />
          </Label>
          <Label>
            Tipo
            <select
              name="type"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
              defaultValue="CONSULTORIO"
            >
              <option value="CONSULTORIO">Consultorio</option>
              <option value="DOMICILIO">Domicilio</option>
            </select>
          </Label>
          <Label>
            Dirección
            <Input name="address" />
          </Label>
          <Label>
            Cobertura / condiciones
            <Textarea name="coverageNotes" rows={2} />
          </Label>
          <Label>
            Buffer traslado (min)
            <Input name="travelBufferMinutes" type="number" defaultValue={0} />
          </Label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked /> Activa
          </label>
          <Button type="submit" variant="outline">
            Guardar ubicación
          </Button>
        </form>
      </div>

      <section>
        <h2 className="mb-3 text-xl">Servicios</h2>
        <ul className="divide-y divide-line rounded-lg border border-line bg-cream">
          {services.map((s) => (
            <li key={s.id} className="p-4 text-sm">
              <p className="text-ink">
                {s.name} · {formatArs(s.priceCents)} · {s.durationMinutes} min
                {!s.isActive ? " (inactivo)" : ""}
              </p>
              <p className="text-stone">
                {s.offerings.map((o) => o.location.name).join(", ") || "Sin modalidades"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
