"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sendContactEmail } from "@/modules/notifications/application/mail";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(5),
});

const MSG_NOT_CONFIGURED =
  "No pudimos enviar tu mensaje por email en este momento. Si aparece un correo de contacto en esta página, escribinos por ese canal.";
const MSG_SEND_FAILED =
  "No pudimos enviar el mensaje. Intentá de nuevo más tarde.";
const MSG_VALIDATION = "Revisá los datos del formulario";

export async function contactAction(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    redirect(`/contacto?error=${encodeURIComponent(MSG_VALIDATION)}`);
  }

  const result = await sendContactEmail(parsed.data);
  if (result.ok) {
    redirect("/contacto?sent=1");
  }
  if (result.reason === "not_configured" || result.reason === "no_recipient") {
    redirect(`/contacto?error=${encodeURIComponent(MSG_NOT_CONFIGURED)}`);
  }
  redirect(`/contacto?error=${encodeURIComponent(MSG_SEND_FAILED)}`);
}
