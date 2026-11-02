"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sendContactEmail } from "@/modules/notifications/application/mail";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(5),
});

export async function contactAction(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    redirect(`/contacto?error=${encodeURIComponent("Revisá los datos del formulario")}`);
  }

  try {
    await sendContactEmail(parsed.data);
    redirect("/contacto?sent=1");
  } catch {
    redirect(`/contacto?error=${encodeURIComponent("No pudimos enviar el mensaje")}`);
  }
}
