import { describe, expect, it } from "vitest";
import { resolveSeedAdmin } from "../../prisma/seed-admin";

describe("resolveSeedAdmin", () => {
  it("resuelve admin con email y password fuertes", () => {
    const admin = resolveSeedAdmin({
      SEED_ADMIN_EMAIL: "Admin@SerBrujula.local",
      SEED_ADMIN_PASSWORD: "SeguraDemoPass99!",
      SEED_ADMIN_NAME: "Demo Admin",
    });
    expect(admin).toEqual({
      email: "admin@serbrujula.local",
      password: "SeguraDemoPass99!",
      displayName: "Demo Admin",
    });
  });

  it("exige SEED_ADMIN_EMAIL", () => {
    expect(() =>
      resolveSeedAdmin({ SEED_ADMIN_PASSWORD: "SeguraDemoPass99!" }),
    ).toThrow(/SEED_ADMIN_EMAIL/);
  });

  it("exige SEED_ADMIN_PASSWORD", () => {
    expect(() =>
      resolveSeedAdmin({ SEED_ADMIN_EMAIL: "admin@serbrujula.local" }),
    ).toThrow(/SEED_ADMIN_PASSWORD/);
  });

  it("rechaza password corto", () => {
    expect(() =>
      resolveSeedAdmin({
        SEED_ADMIN_EMAIL: "admin@serbrujula.local",
        SEED_ADMIN_PASSWORD: "corto",
      }),
    ).toThrow(/12/);
  });

  it("rechaza password de ejemplo ChangeMeAdmin123!", () => {
    expect(() =>
      resolveSeedAdmin({
        SEED_ADMIN_EMAIL: "admin@serbrujula.local",
        SEED_ADMIN_PASSWORD: "ChangeMeAdmin123!",
      }),
    ).toThrow(/prohibida|ejemplo/i);
  });

  it("usa displayName por defecto si no hay SEED_ADMIN_NAME", () => {
    const admin = resolveSeedAdmin({
      SEED_ADMIN_EMAIL: "admin@serbrujula.local",
      SEED_ADMIN_PASSWORD: "SeguraDemoPass99!",
    });
    expect(admin.displayName).toBe("Administradora");
  });
});
