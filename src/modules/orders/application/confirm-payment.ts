import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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

    if (payment.status === "APPROVED" && payment.order.status === "PAID") {
      return { kind: "order" as const, payment, order: payment.order, alreadyProcessed: true };
    }

    for (const item of payment.order.items) {
      if (!item.productId) continue;
      const inv = await tx.inventory.findUnique({
        where: { productId: item.productId },
      });
      if (!inv || inv.quantity < item.quantity) {
        throw new Error(`Stock insuficiente al confirmar ${item.productName}`);
      }
      await tx.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "APPROVED",
        providerPaymentId: input.providerPaymentId ?? payment.providerPaymentId,
        rawPayload: input.rawPayload ?? undefined,
      },
    });

    const fromStatus = payment.order.status;
    const order = await tx.order.update({
      where: { id: payment.orderId! },
      data: { status: "PAID" },
      include: { items: true, customerProfile: true },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus,
        toStatus: "PAID",
        note: "Pago confirmado por proveedor",
      },
    });

    return { kind: "order" as const, payment: updatedPayment, order, alreadyProcessed: false };
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

    if (
      payment.status === "APPROVED" &&
      payment.booking.status === "CONFIRMED"
    ) {
      return {
        kind: "booking" as const,
        payment,
        booking: payment.booking,
        alreadyProcessed: true,
      };
    }

    // Final overlap check
    const conflict = await tx.booking.findFirst({
      where: {
        id: { not: payment.booking.id },
        locationId: payment.booking.locationId,
        status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
        occupiedStartsAt: { lt: payment.booking.occupiedEndsAt },
        occupiedEndsAt: { gt: payment.booking.occupiedStartsAt },
      },
    });
    if (conflict) {
      throw new Error("Conflicto de horario al confirmar la reserva");
    }

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "APPROVED",
        providerPaymentId: input.providerPaymentId ?? payment.providerPaymentId,
        rawPayload: input.rawPayload ?? undefined,
      },
    });

    const booking = await tx.booking.update({
      where: { id: payment.bookingId! },
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
