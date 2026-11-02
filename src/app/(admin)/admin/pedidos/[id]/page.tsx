import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/identity/application/require-admin";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/money";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateOrderStatusAction } from "@/modules/orders/application/admin-actions";

export default async function AdminPedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      shipment: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
      customerProfile: true,
    },
  });
  if (!order) notFound();

  return (
    <Container className="space-y-8 py-10">
      <div>
        <h1 className="text-3xl text-ink">{order.orderNumber}</h1>
        <p className="text-stone">
          {order.status} · {order.fulfillmentType}
        </p>
      </div>

      <section className="rounded-lg border border-line bg-cream p-5">
        <h2 className="text-lg text-ink">Compradora</h2>
        <p className="mt-2 text-sm text-stone">
          {order.customerProfile.fullName}
          <br />
          {order.email}
          {order.customerProfile.phone ? (
            <>
              <br />
              {order.customerProfile.phone}
            </>
          ) : null}
        </p>
        {order.shippingAddress ? (
          <pre className="mt-3 overflow-auto text-xs text-stone">
            {JSON.stringify(order.shippingAddress, null, 2)}
          </pre>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg text-ink">Ítems</h2>
        <ul className="mt-2 space-y-1 text-sm text-stone">
          {order.items.map((i) => (
            <li key={i.id}>
              {i.productName} × {i.quantity} — {formatArs(i.lineTotalCents)}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-ink">Total {formatArs(order.totalCents)}</p>
      </section>

      <section>
        <h2 className="text-lg text-ink">Pagos</h2>
        <ul className="mt-2 space-y-1 text-sm text-stone">
          {order.payments.map((p) => (
            <li key={p.id}>
              {p.provider} · {p.status} · {formatArs(p.amountCents)}
              {p.providerPaymentId ? ` · ${p.providerPaymentId}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <form action={updateOrderStatusAction} className="max-w-md space-y-3 rounded-lg border border-line bg-cream p-5">
        <h2 className="text-lg text-ink">Actualizar estado</h2>
        <input type="hidden" name="orderId" value={order.id} />
        <Label>
          Estado
          <select
            name="status"
            className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
            defaultValue={order.status}
          >
            {[
              "PAID",
              "PREPARING",
              "SHIPPED",
              "READY_FOR_PICKUP",
              "COMPLETED",
              "CANCELLED",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Label>
        <Label>
          Tracking / nota de entrega
          <Input name="trackingCode" defaultValue={order.shipment?.trackingCode ?? ""} />
        </Label>
        <Label>
          Nota
          <Input name="note" />
        </Label>
        <Button type="submit">Guardar</Button>
      </form>

      <section>
        <h2 className="text-lg text-ink">Historial</h2>
        <ul className="mt-2 space-y-1 text-sm text-stone">
          {order.statusHistory.map((h) => (
            <li key={h.id}>
              {h.createdAt.toISOString()} · {h.fromStatus ?? "—"} → {h.toStatus}
              {h.note ? ` — ${h.note}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
