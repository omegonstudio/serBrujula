import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Alert } from "@/components/ui/alert";
import { formatArs } from "@/lib/money";
import { formatInBusinessTz } from "@/lib/timezone";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Reserva" };

export default async function ReservaPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingNumber: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { bookingNumber } = await params;
  const { status } = await searchParams;
  const booking = await prisma.booking.findUnique({
    where: { bookingNumber },
    include: { service: true, location: true, payment: true },
  });
  if (!booking) notFound();

  const confirmed = booking.status === "CONFIRMED";

  return (
    <Container className="max-w-2xl space-y-6 py-16">
      <h1 className="text-4xl text-ink">Reserva {booking.bookingNumber}</h1>
      <div className="h-1 w-20 bg-clay" />

      {status === "return" && !confirmed ? (
        <Alert>
          Volviste desde la pasarela. La confirmación depende de la notificación
          verificada del proveedor de pago.
        </Alert>
      ) : null}

      {confirmed ? (
        <Alert variant="success">Reserva confirmada.</Alert>
      ) : booking.status === "CANCELLED" ? (
        <Alert variant="error">Esta reserva fue cancelada.</Alert>
      ) : (
        <Alert>Estado: {booking.status} · sync: {booking.syncStatus}</Alert>
      )}

      <div className="space-y-2 text-stone">
        <p>{booking.service.name}</p>
        <p>
          {booking.location.name} ({booking.location.type})
        </p>
        <p>{formatInBusinessTz(booking.startsAt)}</p>
        <p>{formatArs(booking.priceCents)}</p>
      </div>
      <Link href="/reservas" className="text-forest hover:underline">
        Volver a reservas
      </Link>
    </Container>
  );
}
