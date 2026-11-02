"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/modules/identity/application/require-admin";

const allowed: OrderStatus[] = [
  "PAID",
  "PREPARING",
  "SHIPPED",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
];

export async function updateOrderStatusAction(formData: FormData) {
  const session = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const toStatus = String(formData.get("status") ?? "") as OrderStatus;
  const note = String(formData.get("note") ?? "") || undefined;
  const trackingCode = String(formData.get("trackingCode") ?? "") || undefined;

  if (!orderId || !allowed.includes(toStatus)) {
    throw new AppError("VALIDATION", "Estado inválido");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("NOT_FOUND", "Pedido no encontrado");

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: toStatus },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus,
        note,
        createdById: session.user.id,
      },
    });
    if (trackingCode) {
      await tx.shipment.upsert({
        where: { orderId },
        create: {
          orderId,
          trackingCode,
          status: toStatus === "SHIPPED" ? "IN_TRANSIT" : "PENDING",
          shippedAt: toStatus === "SHIPPED" ? new Date() : undefined,
        },
        update: {
          trackingCode,
          status: toStatus === "SHIPPED" ? "IN_TRANSIT" : undefined,
          shippedAt: toStatus === "SHIPPED" ? new Date() : undefined,
          deliveredAt: toStatus === "COMPLETED" ? new Date() : undefined,
        },
      });
    }
  });

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
}
