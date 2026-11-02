import { NextResponse } from "next/server";
import { requireAdmin } from "@/modules/identity/application/require-admin";
import { googleAuthUrl } from "@/modules/calendar/infrastructure/google-client";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.redirect(
      new URL("/admin/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    );
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.TOKEN_ENCRYPTION_KEY) {
    return NextResponse.redirect(
      new URL(
        "/admin/calendario?error=missing_google_env",
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      ),
    );
  }

  const state = nanoid(24);
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
