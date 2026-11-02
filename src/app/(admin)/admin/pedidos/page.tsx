import Link from "next/link";
import { requireAdmin } from "@/modules/identity/application/require-admin";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/money";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Pedidos" };

export default async function AdminPedidosPage() {
  await requireAdmin();
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { customerProfile: true, payments: true },
  });

  return (
    <Container className="space-y-6 py-10">
      <h1 className="text-3xl text-ink">Pedidos</h1>
      {orders.length === 0 ? (
        <EmptyState title="Sin pedidos todavía" />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-cream">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <Link href={`/admin/pedidos/${o.id}`} className="text-ink hover:text-forest">
                  {o.orderNumber}
                </Link>
                <p className="text-stone">
                  {o.customerProfile.fullName} · {o.email}
                </p>
              </div>
              <span className="rounded-md bg-sand px-2 py-1">{o.status}</span>
              <span>{formatArs(o.totalCents)}</span>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
