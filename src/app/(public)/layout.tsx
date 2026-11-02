import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getContent } from "@/modules/cms/application/content";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const contactEmail = await getContent("contact.email");

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-cream focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter contactEmail={contactEmail || undefined} />
    </div>
  );
}
