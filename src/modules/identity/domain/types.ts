export type Role = "ADMIN" | "CUSTOMER";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
};

export function isAdmin(role: Role): boolean {
  return role === "ADMIN";
}
