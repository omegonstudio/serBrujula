import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Compensates a checkout that created Order+Payment but failed to create
 * a provider preference. Marks both as cancelled/rejected so they are not orphans.
 */
export async function abandonFailedCheckout(orderId: string, reason: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.status === "PAID") return;

      const fromStatus = order.status;
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus,
          toStatus: "CANCELLED",
          note: reason,
        },
      });
      await tx.payment.updateMany({
        where: {
          orderId,
          status: { not: "APPROVED" },
        },
        data: {
          status: "REJECTED",
          rawPayload: { reason: "preference_create_failed" },
        },
      });
    });
  } catch (error) {
    logger.error("checkout.abandon_failed", { orderId, error });
  }
}
