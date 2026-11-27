type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function write(level: LogLevel, message: string, fields?: LogFields) {
  // `message` del evento siempre gana sobre fields.message (PII redactado y descartado).
  const entry = {
    level,
    time: new Date().toISOString(),
    ...sanitize(fields),
    message,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/** Exact field names that must never appear in clear text (mail/PII). */
const SENSITIVE_EXACT = new Set([
  "to",
  "from",
  "email",
  "html",
  "subject",
  "message",
  "body",
  "content",
  "recipient",
  "recipients",
  "payeremail",
]);

/** Substring match for secrets/credentials. */
const SENSITIVE_SUBSTRING = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "secret",
  "apiKey",
  "creditCard",
  "x-signature",
  "xSignature",
  "signature",
  "webhookSecret",
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_EXACT.has(lower)) return true;
  return SENSITIVE_SUBSTRING.some((s) => lower.includes(s.toLowerCase()));
}

function sanitize(fields?: LogFields): LogFields | undefined {
  if (!fields) return undefined;
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (isSensitiveKey(key)) {
      out[key] = "[redacted]";
    } else if (value instanceof Error) {
      out[key] = { name: value.name, message: value.message };
    } else {
      out[key] = value;
    }
  }
  return out;
}

export const logger = {
  debug: (message: string, fields?: LogFields) => write("debug", message, fields),
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};
