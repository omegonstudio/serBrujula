import { cn } from "@/lib/cn";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-line bg-white px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-sage disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
