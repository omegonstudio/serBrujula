"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { formatArs } from "@/lib/money";
import { submitBookingAction } from "@/modules/booking/application/actions";

type ServiceDto = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  locations: Array<{ id: string; name: string; type: string }>;
};

type SlotDto = {
  startsAt: string;
  endsAt: string;
  label: string;
};

export function BookingWizard({
  services,
  initialError,
  loadSlots,
}: {
  services: ServiceDto[];
  initialError?: string;
  loadSlots: (input: {
    serviceId: string;
    locationId: string;
    fromDate: string;
  }) => Promise<SlotDto[]>;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [locationId, setLocationId] = useState(
    services[0]?.locations[0]?.id ?? "",
  );
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState(initialError ?? "");
  const [pending, startTransition] = useTransition();

  const service = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  function onServiceChange(id: string) {
    setServiceId(id);
    const s = services.find((x) => x.id === id);
    setLocationId(s?.locations[0]?.id ?? "");
    setSlots([]);
    setSelected("");
  }

  function fetchSlots() {
    setError("");
    startTransition(async () => {
      try {
        const fromDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Argentina/Buenos_Aires",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
        const next = await loadSlots({
          serviceId,
          locationId,
          fromDate,
        });
        setSlots(next);
        if (next.length === 0) {
          setError("No hay horarios disponibles en los próximos días.");
        }
      } catch {
        setError("No se pudieron cargar los horarios.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="space-y-3">
        <h2 className="text-xl text-ink">1. Elegí el servicio</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onServiceChange(s.id)}
              className={`rounded-lg border p-4 text-left ${
                serviceId === s.id
                  ? "border-forest bg-sand"
                  : "border-line bg-cream"
              }`}
            >
              <p className="font-medium text-ink">{s.name}</p>
              <p className="mt-1 text-sm text-stone">
                {s.durationMinutes} min · {formatArs(s.priceCents)}
              </p>
            </button>
          ))}
        </div>
      </section>

      {service ? (
        <section className="space-y-3">
          <h2 className="text-xl text-ink">2. Modalidad</h2>
          <div className="flex flex-wrap gap-2">
            {service.locations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => {
                  setLocationId(loc.id);
                  setSlots([]);
                  setSelected("");
                }}
                className={`rounded-md px-3 py-2 text-sm ${
                  locationId === loc.id
                    ? "bg-forest text-cream"
                    : "bg-sand text-ink"
                }`}
              >
                {loc.name} ({loc.type})
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={fetchSlots} disabled={pending}>
            {pending ? "Buscando…" : "Ver horarios disponibles"}
          </Button>
        </section>
      ) : null}

      {slots.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl text-ink">3. Fecha y horario</h2>
          <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot.startsAt}
                type="button"
                onClick={() => setSelected(slot.startsAt)}
                className={`rounded-md border px-2 py-2 text-sm ${
                  selected === slot.startsAt
                    ? "border-forest bg-forest text-cream"
                    : "border-line bg-cream text-ink"
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selected ? (
        <section>
          <h2 className="mb-3 text-xl text-ink">4. Tus datos</h2>
          <form action={submitBookingAction} className="max-w-lg space-y-3">
            <input type="hidden" name="serviceId" value={serviceId} />
            <input type="hidden" name="locationId" value={locationId} />
            <input type="hidden" name="startsAtIso" value={selected} />
            <Label>
              Nombre completo
              <Input name="fullName" required />
            </Label>
            <Label>
              Email
              <Input name="email" type="email" required />
            </Label>
            <Label>
              Teléfono
              <Input name="phone" type="tel" />
            </Label>
            <Label>
              Notas
              <Textarea name="notes" rows={3} />
            </Label>
            <Button type="submit">Reservar y pagar</Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
