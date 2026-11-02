import { auth } from "@/auth";
import { AppError } from "@/lib/errors";
import { isAdmin } from "@/modules/identity/domain/types";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new AppError("UNAUTHORIZED", "Debés iniciar sesión");
  }
  if (!isAdmin(session.user.role)) {
    throw new AppError("FORBIDDEN", "No tenés permisos de administración");
  }
  return session;
}
