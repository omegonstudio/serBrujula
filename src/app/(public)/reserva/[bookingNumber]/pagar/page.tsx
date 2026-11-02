import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatArs } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { confirmManualBookingPaymentAction } from "@/modules/booking/application/actions";

export const metadata = { title: "Pagar reserva (dev)" };

export default async function ReservaPagarPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) redirect("/");
  const { bookingNumber } = await params;
  const booking = await prisma.booking.findUnique({
    where: { bookingNumber },
  });
  if (!booking) notFound();
  if (booking.status === "CONFIRMED") {
    redirect(`/reserva/${booking.bookingNumber}`);
  }

  return (
    <Container className="max-w-lg space-y-6 py-16">
      <Alert>
        Modo desarrollo: confirmación manual de pago de reserva (sin Mercado
        Pago configurado).
      </Alert>
      <h1 className="text-3xl text-ink">Confirmar pago</h1>
      <p className="text-stone">
        {booking.bookingNumber} — {formatArs(booking.priceCents)}
      </p>
      <form action={confirmManualBookingPaymentAction}>
        <input type="hidden" name="bookingId" value={booking.id} />
        <input type="hidden" name="bookingNumber" value={booking.bookingNumber} />
        <Button type="submit">Simular pago aprobado</Button>
      </form>
    </Container>
  );
}
