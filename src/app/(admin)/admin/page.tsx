import Link from "next/link";
import { requireAdmin } from "@/modules/identity/application/require-admin";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/money";
import { Container } from "@/components/ui/container";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const session = await requireAdmin();

  const [orderCount, paidOrders, productCount, lowStock, latestOrders] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.findMany({
        where: { status: { in: ["PAID", "PREPARING", "SHIPPED", "READY_FOR_PICKUP", "COMPLETED"] } },
        select: { totalCents: true },
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.inventory
        .findMany({ include: { product: true } })
        .then((rows) => rows.filter((i) => i.quantity <= i.lowStockThreshold).slice(0, 10)),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customerProfile: true },
      }),
    ]);

  const salesCents = paidOrders.reduce((s, o) => s + o.totalCents, 0);

  return (
    <Container className="space-y-8 py-10">
      <div>
        <h1 className="text-3xl text-ink">Dashboard</h1>
        <p className="text-stone">Hola, {session.user.name ?? session.user.email}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Pedidos", value: String(orderCount) },
          { label: "Ventas", value: formatArs(salesCents) },
          { label: "Productos activos", value: String(productCount) },
          { label: "Bajo stock", value: String(lowStock.length) },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-line bg-cream p-5">
            <p className="text-sm text-stone">{card.label}</p>
            <p className="mt-2 text-2xl text-ink">{card.value}</p>
          </div>
        ))}
      </div>

      {lowStock.length > 0 ? (
        <section>
          <h2 className="text-xl text-ink">Productos con poco stock</h2>
          <ul className="mt-3 space-y-1 text-sm text-stone">
            {lowStock.map((i) => (
              <li key={i.id}>
                {i.product.name}: {i.quantity}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl text-ink">Últimos pedidos</h2>
          <Link href="/admin/pedidos" className="text-sm text-forest hover:underline">
            Ver todos
          </Link>
        </div>
        <ul className="divide-y divide-line rounded-lg border border-line bg-cream">
          {latestOrders.map((o) => (
            <li key={o.id} className="flex justify-between gap-4 p-4 text-sm">
              <Link href={`/admin/pedidos/${o.id}`} className="text-ink hover:text-forest">
                {o.orderNumber}
              </Link>
              <span className="text-stone">{o.status}</span>
              <span>{formatArs(o.totalCents)}</span>
            </li>
          ))}
          {latestOrders.length === 0 ? (
            <li className="p-4 text-stone">Todavía no hay pedidos.</li>
          ) : null}
        </ul>
      </section>
    </Container>
  );
}
