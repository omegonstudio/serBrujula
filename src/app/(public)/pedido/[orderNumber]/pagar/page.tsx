import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatArs } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { confirmManualPaymentAction } from "@/modules/payments/application/manual-confirm-action";

export const metadata = { title: "Confirmar pago (dev)" };

export default async function PagarDemoPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
    redirect("/");
  }

  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { payments: true },
  });
  if (!order) notFound();

  if (order.status === "PAID") {
    redirect(`/pedido/${order.orderNumber}`);
  }

  return (
    <Container className="max-w-lg space-y-6 py-16">
      <Alert variant="info">
        Modo desarrollo: Mercado Pago no está configurado. Esta pantalla simula
        la confirmación del proveedor mediante webhook interno verificado. No
        usar en producción.
      </Alert>
      <h1 className="text-3xl text-ink">Confirmar pago</h1>
      <p className="text-stone">
        Pedido {order.orderNumber} — {formatArs(order.totalCents)}
      </p>
      <form action={confirmManualPaymentAction}>
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="orderNumber" value={order.orderNumber} />
        <Button type="submit">Simular pago aprobado</Button>
      </form>
    </Container>
  );
}
