export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-sand/40 px-6 py-12 text-center">
      <h2 className="text-lg text-ink">{title}</h2>
      {description ? <p className="mt-2 text-sm text-stone">{description}</p> : null}
    </div>
  );
}
