import { createHmac } from "node:crypto";

/** Builds a valid Mercado Pago x-signature header (SDK 3.x: ts in seconds). */
export function buildMpSignature(opts: {
  secret: string;
  dataId?: string;
  requestId?: string;
  ts?: number;
}): { xSignature: string; ts: string } {
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const parts: string[] = [];
  if (opts.dataId) parts.push(`id:${opts.dataId}`);
  if (opts.requestId) parts.push(`request-id:${opts.requestId}`);
  parts.push(`ts:${ts}`);
  const manifest = `${parts.join(";")};`;
  const v1 = createHmac("sha256", opts.secret).update(manifest).digest("hex");
  return { xSignature: `ts=${ts},v1=${v1}`, ts };
}
