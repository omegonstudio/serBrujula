import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/modules/identity/application/require-admin";
import {
  getGoogleOAuthClient,
  googleScopesString,
} from "@/modules/calendar/infrastructure/google-client";
import { encryptSecret } from "@/lib/crypto-tokens";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const session = await requireAdmin();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const jar = await cookies();
    const expected = jar.get("gcal_oauth_state")?.value;

    if (!code || !state || !expected || state !== expected) {
      return NextResponse.redirect(`${appUrl}/admin/calendario?error=oauth_state`);
    }

    const oauth = getGoogleOAuthClient();
    const { tokens } = await oauth.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${appUrl}/admin/calendario?error=oauth_tokens`);
    }

    oauth.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth });
    const me = await oauth2.userinfo.get();
    const email = me.data.email ?? "unknown@google";

    await prisma.calendarConnection.create({
      data: {
        adminUserId: session.user.id,
        googleAccountEmail: email,
        accessTokenEnc: encryptSecret(tokens.access_token),
        refreshTokenEnc: encryptSecret(tokens.refresh_token),
        tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
        calendarId: "primary",
        scopes: googleScopesString(),
      },
    });

    const res = NextResponse.redirect(`${appUrl}/admin/calendario?connected=1`);
    res.cookies.delete("gcal_oauth_state");
    return res;
  } catch (error) {
    logger.error("calendar.oauth.callback_failed", { error });
    return NextResponse.redirect(`${appUrl}/admin/calendario?error=oauth_failed`);
  }
}
