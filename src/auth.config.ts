import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/modules/identity/domain/types";

declare module "next-auth" {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      name?: string | null;
    };
  }
}

type TokenWithRole = {
  id?: string;
  role?: Role;
  [key: string]: unknown;
};

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as TokenWithRole;
      if (user) {
        t.id = user.id;
        t.role = user.role;
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as TokenWithRole;
      if (session.user && t.id && t.role) {
        session.user.id = t.id;
        session.user.role = t.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
