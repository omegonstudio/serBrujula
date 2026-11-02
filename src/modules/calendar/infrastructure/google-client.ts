import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto-tokens";
import { logger } from "@/lib/logger";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no configurados");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function googleAuthUrl(state: string) {
  const client = getGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export function googleScopesString() {
  return SCOPES.join(" ");
}

export async function getAuthedCalendarClient(connectionId: string) {
  const connection = await prisma.calendarConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });
  const oauth = getGoogleOAuthClient();
  oauth.setCredentials({
    access_token: decryptSecret(connection.accessTokenEnc),
    refresh_token: decryptSecret(connection.refreshTokenEnc),
    expiry_date: connection.tokenExpiresAt.getTime(),
  });

  oauth.on("tokens", async (tokens) => {
    try {
      const data: {
        accessTokenEnc?: string;
        refreshTokenEnc?: string;
        tokenExpiresAt?: Date;
      } = {};
      if (tokens.access_token) {
        data.accessTokenEnc = encryptSecret(tokens.access_token);
      }
      if (tokens.refresh_token) {
        data.refreshTokenEnc = encryptSecret(tokens.refresh_token);
      }
      if (tokens.expiry_date) {
        data.tokenExpiresAt = new Date(tokens.expiry_date);
      }
      if (Object.keys(data).length) {
        await prisma.calendarConnection.update({
          where: { id: connectionId },
          data,
        });
      }
    } catch (error) {
      logger.error("calendar.token_refresh_persist_failed", { error });
    }
  });

  return google.calendar({ version: "v3", auth: oauth });
}
