import Link from "next/link";
import { auth, signOut } from "@/auth";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/disponibilidad", label: "Disponibilidad" },
  { href: "/admin/calendario", label: "Calendar" },
  { href: "/admin/contenidos", label: "Contenidos" },
];

export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isLogin = !session;

  if (isLogin) {
    return <div className="min-h-screen bg-sand/40">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-sand/40">
      <header className="border-b border-line bg-cream">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/admin" className="font-[family-name:var(--font-fraunces)] text-lg text-forest">
              Ser Brújula Admin
            </Link>
            <nav className="flex flex-wrap gap-3 text-sm">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="text-stone hover:text-forest">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-sand"
            >
              Salir
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
