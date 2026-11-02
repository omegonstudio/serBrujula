import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";

export const metadata = { title: "Ingresar · Admin" };

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/admin/login?error=credentials");
    }
    throw error;
  }
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  const params = await searchParams;
  const hasError = params.error === "credentials";

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-cream p-8 shadow-sm">
        <h1 className="mb-2 text-2xl text-ink">Administración</h1>
        <p className="mb-6 text-sm text-stone">Ser Brújula</p>
        {hasError ? (
          <p className="mb-4 rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
            Email o contraseña incorrectos.
          </p>
        ) : null}
        <form action={loginAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              className="rounded-md border border-line bg-white px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-sage"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink">Contraseña</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="rounded-md border border-line bg-white px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-sage"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-forest px-4 py-2.5 text-cream transition-colors hover:bg-sage"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
