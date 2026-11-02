import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Alert } from "@/components/ui/alert";
import { formatArs } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Pedido" };

export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { orderNumber } = await params;
  const { status } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, payments: true },
  });
  if (!order) notFound();

  const paid = order.status === "PAID" || order.payments.some((p) => p.status === "APPROVED");

  return (
    <Container className="max-w-2xl space-y-6 py-16">
      <h1 className="text-4xl text-ink">Pedido {order.orderNumber}</h1>
      <div className="h-1 w-20 bg-clay" />

      {status === "return" && !paid ? (
        <Alert>
          Volviste desde la pasarela. El pago se confirma cuando el proveedor
          notifica al servidor; esta página no marca el pedido como pagado por
          sí sola.
        </Alert>
      ) : null}
      {status === "failure" ? (
        <Alert variant="error">El pago no se completó. Podés intentar de nuevo desde la tienda.</Alert>
      ) : null}

      {paid ? (
        <Alert variant="success">
          Pago confirmado. Gracias por tu compra.
        </Alert>
      ) : (
        <Alert>Estado actual: pendiente de pago / procesamiento.</Alert>
      )}

      <ul className="space-y-2 text-stone">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.productName} × {item.quantity} — {formatArs(item.lineTotalCents)}
          </li>
        ))}
      </ul>
      <p className="text-lg text-ink">Total: {formatArs(order.totalCents)}</p>
      <Link href="/tienda" className="text-forest underline-offset-2 hover:underline">
        Volver a la tienda
      </Link>
    </Container>
  );
}
