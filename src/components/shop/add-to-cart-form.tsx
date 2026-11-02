"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function AddToCartForm({
  productId,
  action,
}: {
  productId: string;
  action: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await action(formData);
          if (!result.ok) {
            setError(result.message ?? "Error");
            return;
          }
          router.push("/carrito");
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <label className="text-sm">
        Cantidad
        <Input
          name="quantity"
          type="number"
          min={1}
          defaultValue={1}
          className="mt-1 w-24"
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Agregando…" : "Agregar al carrito"}
      </Button>
      {error ? <Alert variant="error" className="w-full">{error}</Alert> : null}
    </form>
  );
}
