"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatArs } from "@/lib/money";

export function CheckoutFulfillmentFields({
  shippingCents,
}: {
  shippingCents: number;
}) {
  const [type, setType] = useState<"PICKUP" | "SHIPPING">("PICKUP");

  return (
    <div className="space-y-4 rounded-lg border border-line p-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Entrega</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="fulfillmentType"
            value="PICKUP"
            checked={type === "PICKUP"}
            onChange={() => setType("PICKUP")}
          />
          Retiro
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="fulfillmentType"
            value="SHIPPING"
            checked={type === "SHIPPING"}
            onChange={() => setType("SHIPPING")}
          />
          Envío ({formatArs(shippingCents)})
        </label>
      </fieldset>
      {type === "SHIPPING" ? (
        <div className="space-y-3">
          <Label>
            Dirección
            <Input name="addressLine" required={type === "SHIPPING"} />
          </Label>
          <Label>
            Ciudad
            <Input name="city" required={type === "SHIPPING"} />
          </Label>
          <Label>
            Código postal
            <Input name="postalCode" />
          </Label>
        </div>
      ) : null}
    </div>
  );
}
