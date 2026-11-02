"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { createBookingWithHold } from "@/modules/booking/application/create-booking";
import { getPaymentProvider } from "@/modules/payments/application/get-provider";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/modules/identity/application/require-admin";
import {
  cancelBooking,
  createManualBooking,
  rescheduleBooking,
} from "@/modules/booking/application/manage-booking";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

const BOOKING_SESSION = "sb_booking_session";

async function bookingSessionToken() {
  const jar = await cookies();
  const existing = jar.get(BOOKING_SESSION)?.value;
  if (existing) return existing;
  const token = nanoid(24);
  jar.set(BOOKING_SESSION, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return token;
}

export async function submitBookingAction(formData: FormData) {
  try {
    const sessionToken = await bookingSessionToken();
    const { booking, payment } = await createBookingWithHold({
      serviceId: String(formData.get("serviceId") ?? ""),
      locationId: String(formData.get("locationId") ?? ""),
      startsAtIso: String(formData.get("startsAtIso") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? "") || undefined,
      notes: String(formData.get("notes") ?? "") || undefined,
      sessionToken,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const provider = getPaymentProvider();
    const checkout = await provider.createCheckout({
      orderId: booking.id,
      orderNumber: booking.bookingNumber,
      amountCents: booking.priceCents,
      currency: booking.currency,
      payerEmail: String(formData.get("email") ?? ""),
      description: `Reserva ${booking.bookingNumber} — ${booking.service.name}`,
      successUrl: `${appUrl}/reserva/${booking.bookingNumber}?status=return`,
      failureUrl: `${appUrl}/reserva/${booking.bookingNumber}?status=failure`,
      pendingUrl: `${appUrl}/reserva/${booking.bookingNumber}?status=pending`,
      idempotencyKey: payment.idempotencyKey,
    });

    // Manual provider uses /pedido/.../pagar — override for bookings
    if (provider.name === "MANUAL") {
      redirect(`/reserva/${booking.bookingNumber}/pagar`);
    }

    redirect(checkout.redirectUrl);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    logger.error("booking.submit.failed", { error });
    const message = isAppError(error)
      ? error.message
      : "No se pudo crear la reserva";
    redirect(`/reservas?error=${encodeURIComponent(message)}`);
  }
}

export async function confirmManualBookingPaymentAction(formData: FormData) {
  "use server";
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) redirect("/");
  const bookingId = String(formData.get("bookingId") ?? "");
  const bookingNumber = String(formData.get("bookingNumber") ?? "");
  const { confirmPaymentApproved } = await import(
    "@/modules/orders/application/confirm-payment"
  );
  await confirmPaymentApproved({
    bookingId,
    providerPaymentId: `manual-${bookingId}`,
    rawPayload: { source: "manual-booking-dev" },
  });
  redirect(`/reserva/${bookingNumber}`);
}

export async function adminCancelBookingAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("bookingId") ?? "");
  await cancelBooking(id, String(formData.get("note") ?? "") || undefined);
  revalidatePath("/admin/agenda");
  redirect("/admin/agenda");
}

export async function adminRescheduleBookingAction(formData: FormData) {
  await requireAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");
  const startsAtIso = String(formData.get("startsAtIso") ?? "");
  await rescheduleBooking({ bookingId, startsAtIso });
  revalidatePath("/admin/agenda");
  redirect("/admin/agenda");
}

export async function adminCreateBookingAction(formData: FormData) {
  await requireAdmin();
  await createManualBooking({
    serviceId: String(formData.get("serviceId") ?? ""),
    locationId: String(formData.get("locationId") ?? ""),
    startsAtIso: String(formData.get("startsAtIso") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath("/admin/agenda");
  redirect("/admin/agenda");
}

export async function upsertServiceAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "") || undefined;
  const name = String(formData.get("name") ?? "");
  const data = {
    name,
    slug: slugify(String(formData.get("slug") ?? name)),
    description: String(formData.get("description") ?? ""),
    durationMinutes: Number(formData.get("durationMinutes") ?? 60),
    bufferBeforeMinutes: Number(formData.get("bufferBeforeMinutes") ?? 0),
    bufferAfterMinutes: Number(formData.get("bufferAfterMinutes") ?? 15),
    priceCents: Number(formData.get("priceCents") ?? 0),
    isActive: formData.get("isActive") === "on",
  };

  const locationIds = formData.getAll("locationIds").map(String);

  const service = id
    ? await prisma.service.update({ where: { id }, data })
    : await prisma.service.create({ data });

  await prisma.serviceOffering.deleteMany({ where: { serviceId: service.id } });
  for (const locationId of locationIds) {
    await prisma.serviceOffering.create({
      data: { serviceId: service.id, locationId, isActive: true },
    });
  }

  revalidatePath("/admin/servicios");
  revalidatePath("/reservas");
  redirect("/admin/servicios");
}

export async function upsertLocationAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "") || undefined;
  const type = String(formData.get("type") ?? "CONSULTORIO") as
    | "CONSULTORIO"
    | "DOMICILIO";
  const data = {
    type,
    name: String(formData.get("name") ?? ""),
    address: String(formData.get("address") ?? "") || null,
    coverageNotes: String(formData.get("coverageNotes") ?? "") || null,
    travelBufferMinutes: Number(formData.get("travelBufferMinutes") ?? 0),
    isActive: formData.get("isActive") === "on",
  };
  if (id) {
    await prisma.serviceLocation.update({ where: { id }, data });
  } else {
    await prisma.serviceLocation.create({ data });
  }
  revalidatePath("/admin/servicios");
  redirect("/admin/servicios");
}

export async function saveAvailabilityRuleAction(formData: FormData) {
  await requireAdmin();
  await prisma.availabilityRule.create({
    data: {
      locationId: String(formData.get("locationId") ?? ""),
      dayOfWeek: Number(formData.get("dayOfWeek") ?? 1),
      startTimeLocal: String(formData.get("startTimeLocal") ?? "09:00"),
      endTimeLocal: String(formData.get("endTimeLocal") ?? "18:00"),
      timezone: "America/Argentina/Buenos_Aires",
    },
  });
  revalidatePath("/admin/disponibilidad");
  redirect("/admin/disponibilidad");
}

export async function saveExceptionAction(formData: FormData) {
  await requireAdmin();
  const locationId = String(formData.get("locationId") ?? "") || null;
  await prisma.availabilityException.create({
    data: {
      locationId,
      type: String(formData.get("type") ?? "BLOCK") as "BLOCK" | "CUSTOM_OPEN",
      startsAt: new Date(String(formData.get("startsAt") ?? "")),
      endsAt: new Date(String(formData.get("endsAt") ?? "")),
      note: String(formData.get("note") ?? "") || null,
    },
  });
  revalidatePath("/admin/disponibilidad");
  redirect("/admin/disponibilidad");
}

export async function deleteRuleAction(formData: FormData) {
  await requireAdmin();
  await prisma.availabilityRule.delete({
    where: { id: String(formData.get("id") ?? "") },
  });
  revalidatePath("/admin/disponibilidad");
}
