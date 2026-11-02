import { cn } from "@/lib/cn";

export function Alert({
  children,
  variant = "info",
  className,
}: {
  children: React.ReactNode;
  variant?: "info" | "error" | "success";
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        variant === "error" && "bg-error/10 text-error",
        variant === "success" && "bg-success/10 text-success",
        variant === "info" && "bg-sand text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}
