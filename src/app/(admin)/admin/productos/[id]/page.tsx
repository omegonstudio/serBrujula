import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/identity/application/require-admin";
import { getProductById, listCategories } from "@/modules/catalog/application/queries";
import { upsertProductAction } from "@/modules/catalog/application/commands";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductById(id),
    listCategories(),
  ]);
  if (!product) notFound();

  return (
    <Container className="max-w-xl space-y-6 py-10">
      <h1 className="text-3xl text-ink">Editar producto</h1>
      <form action={upsertProductAction} className="space-y-3 rounded-lg border border-line bg-cream p-5">
        <input type="hidden" name="id" value={product.id} />
        <Label>
          Nombre
          <Input name="name" required defaultValue={product.name} />
        </Label>
        <Label>
          Slug
          <Input name="slug" defaultValue={product.slug} />
        </Label>
        <Label>
          Descripción
          <Textarea name="description" required rows={4} defaultValue={product.description} />
        </Label>
        <Label>
          Precio (centavos)
          <Input name="priceCents" type="number" required defaultValue={product.priceCents} />
        </Label>
        <Label>
          Stock
          <Input
            name="stock"
            type="number"
            required
            defaultValue={product.inventory?.quantity ?? 0}
          />
        </Label>
        <Label>
          Categoría
          <select
            name="categoryId"
            className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
            defaultValue={product.categoryId ?? ""}
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Label>
        <Label>
          URL de imagen
          <Input
            name="imageUrl"
            type="url"
            defaultValue={product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url ?? ""}
          />
        </Label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} />{" "}
          Destacado
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={product.isActive} /> Activo
        </label>
        <p className="text-xs text-stone">
          Desmarcá “Activo” y guardá, o usá Desactivar en el listado.
        </p>
        <input type="hidden" name="isActiveFlag" value="1" />
        <Button type="submit">Guardar cambios</Button>
      </form>
    </Container>
  );
}
