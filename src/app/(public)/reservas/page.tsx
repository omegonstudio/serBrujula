import { Container } from "@/components/ui/container";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { prisma } from "@/lib/prisma";
import { loadSlotsAction } from "@/modules/booking/application/load-slots-action";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Reservas" };

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: {
      offerings: {
        where: { isActive: true },
        include: { location: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const dto = services
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      locations: s.offerings
        .filter((o) => o.location.isActive)
        .map((o) => ({
          id: o.location.id,
          name: o.location.name,
          type: o.location.type,
        })),
    }))
    .filter((s) => s.locations.length > 0);

  return (
    <Container className="space-y-8 py-16">
      <div>
        <h1 className="text-4xl text-ink">Reservar sesión</h1>
        <div className="mt-4 h-1 w-20 bg-clay" />
        <p className="mt-4 max-w-2xl text-stone">
          Elegí el servicio, la modalidad y un horario disponible. Los horarios
          respetan la agenda local y Google Calendar.
        </p>
      </div>
      {dto.length === 0 ? (
        <EmptyState
          title="Aún no hay servicios publicables"
          description="La administración debe configurar servicios, ubicaciones y disponibilidad."
        />
      ) : (
        <BookingWizard
          services={dto}
          initialError={params.error}
          loadSlots={loadSlotsAction}
        />
      )}
    </Container>
  );
}
