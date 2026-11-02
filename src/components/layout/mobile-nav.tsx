"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function MobileNav({
  items,
}: {
  items: Array<{ href: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Cerrar" : "Menú"}
      </Button>
      {open ? (
        <div
          id="mobile-menu"
          className="absolute left-0 right-0 top-full border-b border-line bg-cream px-4 py-4 shadow-md"
        >
          <nav className="flex flex-col gap-3" aria-label="Móvil">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-ink"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
