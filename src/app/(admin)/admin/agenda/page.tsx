import { requireAdmin } from "@/modules/identity/application/require-admin";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { formatInBusinessTz } from "@/lib/timezone";
import { formatArs } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminCancelBookingAction,
  adminCreateBookingAction,
  adminRescheduleBookingAction,
} from "@/modules/booking/application/actions";
import Link from "next/link";

export const metadata = { title: "Agenda" };

export default async function AdminAgendaPage() {
  await requireAdmin();
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [bookings, services, locations] = await Promise.all([
    prisma.booking.findMany({
      where: {
        startsAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        status: { not: "RESCHEDULED" },
      },
      include: {
        service: true,
        location: true,
        customerProfile: true,
      },
      orderBy: { startsAt: "asc" },
      take: 100,
    }),
    prisma.service.findMany({ where: { isActive: true } }),
    prisma.serviceLocation.findMany({ where: { isActive: true } }),
  ]);

  const thisWeek = bookings.filter((b) => b.startsAt <= weekEnd);

  return (
    <Container className="space-y-10 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl text-ink">Agenda</h1>
          <p className="text-stone">
            Vista principal de turnos. Google Calendar es el espejo sincronizado.
          </p>
        </div>
        <Link href="/admin/calendario" className="text-sm text-forest hover:underline">
          Google Calendar
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-xl">Próximos 7 días ({thisWeek.length})</h2>
        <ul className="divide-y divide-line rounded-lg border border-line bg-cream">
          {bookings.map((b) => (
            <li key={b.id} className="space-y-3 p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-ink">
                    {formatInBusinessTz(b.startsAt)} · {b.service.name}
                  </p>
                  <p className="text-stone">
                    {b.customerProfile.fullName} · {b.location.name} · {b.status} ·
                    sync {b.syncStatus} · {formatArs(b.priceCents)}
                  </p>
                  <p className="text-xs text-stone">{b.bookingNumber}</p>
                </div>
                {b.status !== "CANCELLED" ? (
                  <form action={adminCancelBookingAction}>
                    <input type="hidden" name="bookingId" value={b.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Cancelar
                    </Button>
                  </form>
                ) : null}
              </div>
              {b.status === "CONFIRMED" ? (
                <form
                  action={adminRescheduleBookingAction}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="bookingId" value={b.id} />
                  <Label className="text-xs">
                    Reprogramar (ISO)
                    <Input
                      name="startsAtIso"
                      placeholder="2026-11-01T14:00:00.000Z"
                      required
                    />
                  </Label>
                  <Button type="submit" size="sm" variant="outline">
                    Reprogramar
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
          {bookings.length === 0 ? (
            <li className="p-4 text-stone">No hay reservas próximas.</li>
          ) : null}
        </ul>
      </section>

      <form
        action={adminCreateBookingAction}
        className="max-w-xl space-y-3 rounded-lg border border-line bg-cream p-5"
      >
        <h2 className="text-xl">Crear reserva manual</h2>
        <Label>
          Servicio
          <select
            name="serviceId"
            required
            className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Label>
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
          Inicio (ISO UTC)
          <Input name="startsAtIso" required placeholder="2026-11-01T15:00:00.000Z" />
        </Label>
        <Label>
          Nombre
          <Input name="fullName" required />
        </Label>
        <Label>
          Email
          <Input name="email" type="email" required />
        </Label>
        <Label>
          Teléfono
          <Input name="phone" />
        </Label>
        <Button type="submit">Crear y confirmar</Button>
      </form>
    </Container>
  );
}
