export function SectionHeading({
  title,
  subtitle,
  align = "left",
}: {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center" : undefined}>
      <h2 className="text-3xl text-ink md:text-4xl">{title}</h2>
      <div
        className={`mt-4 h-1 w-20 bg-clay ${align === "center" ? "mx-auto" : ""}`}
      />
      {subtitle ? (
        <p className={`mt-4 max-w-2xl text-lg text-stone ${align === "center" ? "mx-auto" : ""}`}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
