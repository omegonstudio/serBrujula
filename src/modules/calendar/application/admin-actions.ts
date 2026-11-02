"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/modules/identity/application/require-admin";
import { prisma } from "@/lib/prisma";
import { getAuthedCalendarClient } from "@/modules/calendar/infrastructure/google-client";

export async function selectCalendarAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("connectionId") ?? "");
  const calendarId = String(formData.get("calendarId") ?? "primary");
  await prisma.calendarConnection.update({
    where: { id },
    data: { calendarId },
  });
  revalidatePath("/admin/calendario");
  redirect("/admin/calendario");
}

export async function disconnectCalendarAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("connectionId") ?? "");
  await prisma.calendarEvent.deleteMany({ where: { connectionId: id } });
  await prisma.calendarConnection.delete({ where: { id } });
  revalidatePath("/admin/calendario");
  redirect("/admin/calendario");
}

export async function listGoogleCalendars(connectionId: string) {
  const calendar = await getAuthedCalendarClient(connectionId);
  const res = await calendar.calendarList.list();
  return (res.data.items ?? []).map((c) => ({
    id: c.id ?? "primary",
    summary: c.summary ?? c.id ?? "Calendario",
  }));
}
