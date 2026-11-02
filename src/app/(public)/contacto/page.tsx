import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { getContent } from "@/modules/cms/application/content";
import { contactAction } from "@/modules/notifications/application/contact-action";

export const metadata = { title: "Contacto" };

export default async function ContactoPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const email = await getContent("contact.email");
  const intro = await getContent(
    "contact.intro",
    "Escribinos tu consulta. Te respondemos a la brevedad.",
  );

  return (
    <Container className="max-w-2xl space-y-8 py-16">
      <div>
        <h1 className="text-4xl text-ink">Contacto</h1>
        <div className="mt-4 h-1 w-20 bg-clay" />
        <p className="mt-6 text-stone">{intro}</p>
        {email ? <p className="mt-2 text-sm text-stone">{email}</p> : null}
      </div>
      {params.sent ? (
        <Alert variant="success">Recibimos tu mensaje. Gracias por escribirnos.</Alert>
      ) : null}
      {params.error ? <Alert variant="error">{params.error}</Alert> : null}
      <form action={contactAction} className="space-y-4">
        <Label>
          Nombre
          <Input name="name" required autoComplete="name" />
        </Label>
        <Label>
          Email
          <Input name="email" type="email" required autoComplete="email" />
        </Label>
        <Label>
          Mensaje
          <Textarea name="message" required rows={5} />
        </Label>
        <Button type="submit">Enviar consulta</Button>
      </form>
    </Container>
  );
}
