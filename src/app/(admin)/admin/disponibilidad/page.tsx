import { requireAdmin } from "@/modules/identity/application/require-admin";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  deleteRuleAction,
  saveAvailabilityRuleAction,
  saveExceptionAction,
} from "@/modules/booking/application/actions";
import { formatInBusinessTz } from "@/lib/timezone";

export const metadata = { title: "Disponibilidad" };

const days = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export default async function AdminDisponibilidadPage() {
  await requireAdmin();
  const [locations, rules, exceptions] = await Promise.all([
    prisma.serviceLocation.findMany({ where: { isActive: true } }),
    prisma.availabilityRule.findMany({
      include: { location: true },
      orderBy: [{ locationId: "asc" }, { dayOfWeek: "asc" }],
    }),
    prisma.availabilityException.findMany({
      include: { location: true },
      orderBy: { startsAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <Container className="space-y-10 py-10">
      <h1 className="text-3xl text-ink">Disponibilidad</h1>
      <p className="text-stone">
        Zona horaria de negocio: America/Argentina/Buenos_Aires. Cada ubicación
        tiene su propia grilla.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        <form action={saveAvailabilityRuleAction} className="space-y-3 rounded-lg border border-line bg-cream p-5">
          <h2 className="text-xl">Regla semanal</h2>
          <Label>
            Ubicación
            <select
              name="locationId"
              required
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Label>
          <Label>
            Día
            <select
              name="dayOfWeek"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
              defaultValue={1}
            >
              {days.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Label>
          <Label>
            Desde (HH:mm)
            <Input name="startTimeLocal" defaultValue="09:00" required />
          </Label>
          <Label>
            Hasta (HH:mm)
            <Input name="endTimeLocal" defaultValue="18:00" required />
          </Label>
          <Button type="submit">Agregar regla</Button>
        </form>

        <form action={saveExceptionAction} className="space-y-3 rounded-lg border border-line bg-cream p-5">
          <h2 className="text-xl">Excepción / bloqueo</h2>
          <Label>
            Ubicación (vacío = global)
            <select
              name="locationId"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
              defaultValue=""
            >
              <option value="">Global</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Label>
          <Label>
            Tipo
            <select
              name="type"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
              defaultValue="BLOCK"
            >
              <option value="BLOCK">Bloqueo</option>
              <option value="CUSTOM_OPEN">Apertura especial</option>
            </select>
          </Label>
          <Label>
            Inicio (ISO / datetime-local)
            <Input name="startsAt" type="datetime-local" required />
          </Label>
          <Label>
            Fin
            <Input name="endsAt" type="datetime-local" required />
          </Label>
          <Label>
            Nota
            <Input name="note" />
          </Label>
          <Button type="submit" variant="outline">
            Guardar excepción
          </Button>
        </form>
      </div>

      <section>
        <h2 className="mb-3 text-xl">Reglas</h2>
        <ul className="divide-y divide-line rounded-lg border border-line bg-cream">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span>
                {r.location.name}: {days[r.dayOfWeek]} {r.startTimeLocal}–
                {r.endTimeLocal}
              </span>
              <form action={deleteRuleAction}>
                <input type="hidden" name="id" value={r.id} />
                <Button type="submit" variant="ghost" size="sm">
                  Eliminar
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl">Excepciones recientes</h2>
        <ul className="space-y-2 text-sm text-stone">
          {exceptions.map((e) => (
            <li key={e.id}>
              {e.type} · {e.location?.name ?? "Global"} ·{" "}
              {formatInBusinessTz(e.startsAt)} → {formatInBusinessTz(e.endsAt)}
              {e.note ? ` — ${e.note}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
