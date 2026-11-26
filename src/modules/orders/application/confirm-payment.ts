import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { sendOrderPaidEmail } from "@/modules/notifications/application/mail";
import { sendBookingConfirmedEmail } from "@/modules/notifications/application/booking-mail";
import { syncBookingToCalendar } from "@/modules/calendar/application/sync-booking";

type ConfirmInput = {
  orderId?: string;
  bookingId?: string;
  providerPaymentId?: string;
  rawPayload?: Prisma.InputJsonValue;
};

/**
 * Marks payment approved. Idempotent for orders and bookings.
 * Uses row lock + conditional updates so concurrent webhooks cannot
 * double-decrement stock or send duplicate side effects.
 */
export async function confirmPaymentApproved(input: ConfirmInput) {
  if (!input.orderId && !input.bookingId) {
    throw new Error("orderId or bookingId required");
  }

  if (input.bookingId) {
    return confirmBookingPayment(input);
  }
  return confirmOrderPayment(input);
}

async function confirmOrderPayment(input: ConfirmInput) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { orderId: input.orderId },
      orderBy: { createdAt: "desc" },
      include: { order: { include: { items: true } } },
    });

    if (!payment?.order) {
      throw new Error(`Payment not found for order ${input.orderId}`);
    }

    await tx.$executeRaw`SELECT id FROM "Payment" WHERE id = ${payment.id} FOR UPDATE`;

    const locked = await tx.payment.findUnique({
      where: { id: payment.id },
      include: { order: { include: { items: true } } },
    });
    if (!locked?.order) {
      throw new Error(`Payment not found for order ${input.orderId}`);
    }

    if (locked.status === "APPROVED") {
      if (locked.order.status !== "PAID") {
        const fromStatus = locked.order.status;
        await tx.order.update({
          where: { id: locked.orderId! },
          data: { status: "PAID" },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: locked.orderId!,
            fromStatus,
            toStatus: "PAID",
            note: "Pago confirmado por proveedor",
          },
        });
      }
      const order = await tx.order.findUniqueOrThrow({
        where: { id: locked.orderId! },
        include: { items: true, customerProfile: true },
      });
      return {
        kind: "order" as const,
        payment: locked,
        order,
        alreadyProcessed: true,
      };
    }

    for (const item of locked.order.items) {
      if (!item.productId) continue;
      const stocked = await tx.inventory.updateMany({
        where: {
          productId: item.productId,
          quantity: { gte: item.quantity },
        },
        data: { quantity: { decrement: item.quantity } },
      });
      if (stocked.count === 0) {
        throw new AppError(
          "STOCK",
          `Stock insuficiente al confirmar ${item.productName}`,
        );
      }
    }

    const claimed = await tx.payment.updateMany({
      where: {
        id: locked.id,
        status: { not: "APPROVED" },
      },
      data: {
        status: "APPROVED",
        providerPaymentId: input.providerPaymentId ?? locked.providerPaymentId,
        rawPayload: input.rawPayload ?? undefined,
      },
    });

    // Under FOR UPDATE this should not happen; abort to roll back stock.
    if (claimed.count === 0) {
      throw new AppError("CONFLICT", "Pago ya procesado concurrentemente");
    }

    const fromStatus = locked.order.status;
    await tx.order.updateMany({
      where: {
        id: locked.orderId!,
        status: { not: "PAID" },
      },
      data: { status: "PAID" },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: locked.orderId!,
        fromStatus,
        toStatus: "PAID",
        note: "Pago confirmado por proveedor",
      },
    });

    const order = await tx.order.findUniqueOrThrow({
      where: { id: locked.orderId! },
      include: { items: true, customerProfile: true },
    });
    const updatedPayment = await tx.payment.findUniqueOrThrow({
      where: { id: locked.id },
    });

    return {
      kind: "order" as const,
      payment: updatedPayment,
      order,
      alreadyProcessed: false,
    };
  });

  if (!result.alreadyProcessed) {
    logger.info("payment.approved", {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
    });
    await sendOrderPaidEmail(result.order.id).catch((error) => {
      logger.error("mail.order_paid.failed", { error, orderId: result.order.id });
    });
  }

  return result;
}

async function confirmBookingPayment(input: ConfirmInput) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { bookingId: input.bookingId },
      include: { booking: true },
    });
    if (!payment?.booking) {
      throw new Error(`Payment not found for booking ${input.bookingId}`);
    }

    await tx.$executeRaw`SELECT id FROM "Payment" WHERE id = ${payment.id} FOR UPDATE`;

    const locked = await tx.payment.findUnique({
      where: { id: payment.id },
      include: { booking: true },
    });
    if (!locked?.booking) {
      throw new Error(`Payment not found for booking ${input.bookingId}`);
    }

    if (locked.status === "APPROVED") {
      if (locked.booking.status !== "CONFIRMED") {
        await tx.booking.update({
          where: { id: locked.bookingId! },
          data: {
            status: "CONFIRMED",
            syncStatus: "SYNC_PENDING",
          },
        });
      }
      const booking = await tx.booking.findUniqueOrThrow({
        where: { id: locked.bookingId! },
      });
      return {
        kind: "booking" as const,
        payment: locked,
        booking,
        alreadyProcessed: true,
      };
    }

    const conflict = await tx.booking.findFirst({
      where: {
        id: { not: locked.booking.id },
        locationId: locked.booking.locationId,
        status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
        occupiedStartsAt: { lt: locked.booking.occupiedEndsAt },
        occupiedEndsAt: { gt: locked.booking.occupiedStartsAt },
      },
    });
    if (conflict) {
      throw new Error("Conflicto de horario al confirmar la reserva");
    }

    const claimed = await tx.payment.updateMany({
      where: {
        id: locked.id,
        status: { not: "APPROVED" },
      },
      data: {
        status: "APPROVED",
        providerPaymentId: input.providerPaymentId ?? locked.providerPaymentId,
        rawPayload: input.rawPayload ?? undefined,
      },
    });

    if (claimed.count === 0) {
      throw new AppError("CONFLICT", "Pago de reserva ya procesado concurrentemente");
    }

    const booking = await tx.booking.update({
      where: { id: locked.bookingId! },
      data: {
        status: "CONFIRMED",
        syncStatus: "SYNC_PENDING",
      },
    });

    await tx.bookingHold.deleteMany({
      where: {
        locationId: booking.locationId,
        startsAt: booking.occupiedStartsAt,
        endsAt: booking.occupiedEndsAt,
      },
    });

    const updatedPayment = await tx.payment.findUniqueOrThrow({
      where: { id: locked.id },
    });

    return {
      kind: "booking" as const,
      payment: updatedPayment,
      booking,
      alreadyProcessed: false,
    };
  });

  if (!result.alreadyProcessed) {
    logger.info("booking.payment.approved", {
      bookingId: result.booking.id,
      bookingNumber: result.booking.bookingNumber,
    });
    await sendBookingConfirmedEmail(result.booking.id).catch((error) => {
      logger.error("mail.booking_confirmed.failed", {
        error,
        bookingId: result.booking.id,
      });
    });
    await syncBookingToCalendar(result.booking.id);
  }

  return result;
}
