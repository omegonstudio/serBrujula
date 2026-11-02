import Link from "next/link";
import { requireAdmin } from "@/modules/identity/application/require-admin";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  disconnectCalendarAction,
  listGoogleCalendars,
  selectCalendarAction,
} from "@/modules/calendar/application/admin-actions";

export const metadata = { title: "Google Calendar" };

export default async function AdminCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const connection = await prisma.calendarConnection.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  let calendars: Array<{ id: string; summary: string }> = [];
  if (connection && process.env.GOOGLE_CLIENT_ID) {
    try {
      calendars = await listGoogleCalendars(connection.id);
    } catch {
      calendars = [];
    }
  }

  return (
    <Container className="space-y-6 py-10">
      <h1 className="text-3xl text-ink">Google Calendar</h1>
      <p className="text-stone">
        Conectá la cuenta para consultar FreeBusy y crear eventos de reservas.
        Los tokens se guardan cifrados.
      </p>

      {params.connected ? (
        <Alert variant="success">Cuenta conectada correctamente.</Alert>
      ) : null}
      {params.error ? (
        <Alert variant="error">
          Error de conexión ({params.error}). Verificá GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI y TOKEN_ENCRYPTION_KEY.
        </Alert>
      ) : null}

      {!connection ? (
        <div className="space-y-3">
          {!process.env.GOOGLE_CLIENT_ID ? (
            <Alert>
              Google OAuth no está configurado en el entorno. Podés operar
              reservas solo con la agenda local hasta conectarlo.
            </Alert>
          ) : (
            <Link
              href="/api/calendar/connect"
              className="inline-flex rounded-md bg-forest px-4 py-2.5 text-cream hover:bg-sage"
            >
              Conectar Google Calendar
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-line bg-cream p-5">
          <p className="text-ink">
            Conectado: {connection.googleAccountEmail}
          </p>
          <p className="text-sm text-stone">
            Calendario activo: {connection.calendarId}
          </p>
          {calendars.length > 0 ? (
            <form action={selectCalendarAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="connectionId" value={connection.id} />
              <label className="text-sm">
                Seleccionar calendario
                <select
                  name="calendarId"
                  defaultValue={connection.calendarId}
                  className="mt-1 block rounded-md border border-line bg-white px-3 py-2"
                >
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.summary}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" size="sm">
                Guardar
              </Button>
            </form>
          ) : null}
          <form action={disconnectCalendarAction}>
            <input type="hidden" name="connectionId" value={connection.id} />
            <Button type="submit" variant="ghost" size="sm">
              Desconectar
            </Button>
          </form>
        </div>
      )}
    </Container>
  );
}
