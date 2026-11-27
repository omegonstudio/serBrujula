/**
 * Resolución segura del admin de seed (sin defaults de contraseña).
 * Usado por `prisma/seed.ts` y tests unitarios.
 */

export type SeedAdminInput = {
  SEED_ADMIN_EMAIL?: string | undefined;
  SEED_ADMIN_PASSWORD?: string | undefined;
  SEED_ADMIN_NAME?: string | undefined;
  [key: string]: string | undefined;
};

export type SeedAdmin = {
  email: string;
  password: string;
  displayName: string;
};

const FORBIDDEN_PASSWORDS = new Set([
  "ChangeMeAdmin123!",
  "changeme",
  "password",
  "password123",
  "admin",
  "admin123",
]);

export function resolveSeedAdmin(env: SeedAdminInput): SeedAdmin {
  const email = env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD;
  const displayName = env.SEED_ADMIN_NAME?.trim() || "Administradora";

  if (!email) {
    throw new Error(
      "SEED_ADMIN_EMAIL es obligatorio para ejecutar el seed (sin valor por defecto).",
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("SEED_ADMIN_EMAIL no es un email válido.");
  }
  if (!password) {
    throw new Error(
      "SEED_ADMIN_PASSWORD es obligatorio para ejecutar el seed (sin valor por defecto).",
    );
  }
  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres.");
  }
  if (FORBIDDEN_PASSWORDS.has(password)) {
    throw new Error(
      "SEED_ADMIN_PASSWORD no puede ser una contraseña de ejemplo/prohibida.",
    );
  }

  return { email, password, displayName };
}
