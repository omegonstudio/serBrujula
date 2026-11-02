import Link from "next/link";
import { requireAdmin } from "@/modules/identity/application/require-admin";
import {
  listAdminProducts,
  listCategories,
} from "@/modules/catalog/application/queries";
import {
  createCategoryAction,
  deactivateProductAction,
  upsertProductAction,
} from "@/modules/catalog/application/commands";
import { formatArs } from "@/lib/money";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Productos" };

export default async function AdminProductosPage() {
  await requireAdmin();
  const [products, categories] = await Promise.all([
    listAdminProducts(),
    listCategories(),
  ]);

  return (
    <Container className="space-y-10 py-10">
      <h1 className="text-3xl text-ink">Productos</h1>

      <section className="grid gap-8 lg:grid-cols-2">
        <form action={upsertProductAction} className="space-y-3 rounded-lg border border-line bg-cream p-5">
          <h2 className="text-xl text-ink">Nuevo / editar (crear)</h2>
          <Label>
            Nombre
            <Input name="name" required />
          </Label>
          <Label>
            Descripción
            <Textarea name="description" required rows={3} />
          </Label>
          <Label>
            Precio (centavos ARS)
            <Input name="priceCents" type="number" min={0} required placeholder="450000 = $4.500" />
          </Label>
          <Label>
            Stock
            <Input name="stock" type="number" min={0} required defaultValue={10} />
          </Label>
          <Label>
            Categoría
            <select
              name="categoryId"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
              defaultValue=""
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
            <Input name="imageUrl" type="url" placeholder="https://..." />
          </Label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFeatured" /> Destacado
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked /> Activo
          </label>
          <Button type="submit">Guardar producto</Button>
        </form>

        <form action={createCategoryAction} className="space-y-3 rounded-lg border border-line bg-cream p-5">
          <h2 className="text-xl text-ink">Nueva categoría</h2>
          <Label>
            Nombre
            <Input name="name" required />
          </Label>
          <Label>
            Descripción
            <Textarea name="description" rows={2} />
          </Label>
          <Button type="submit" variant="outline">
            Crear categoría
          </Button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-xl text-ink">Listado</h2>
        <ul className="divide-y divide-line rounded-lg border border-line bg-cream">
          {products.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-ink">
                  {p.name}{" "}
                  {!p.isActive ? (
                    <span className="text-xs text-error">(inactivo)</span>
                  ) : null}
                  {p.isFeatured ? (
                    <span className="text-xs text-clay"> · destacado</span>
                  ) : null}
                </p>
                <p className="text-sm text-stone">
                  {formatArs(p.priceCents)} · stock {p.inventory?.quantity ?? 0}
                </p>
                <Link href={`/tienda/${p.slug}`} className="text-xs text-forest hover:underline">
                  Ver en tienda
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/productos/${p.id}`}
                  className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-sand"
                >
                  Editar
                </Link>
                {p.isActive ? (
                  <form action={deactivateProductAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Desactivar
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
