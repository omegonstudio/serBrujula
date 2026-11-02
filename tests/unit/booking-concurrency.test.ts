import { describe, expect, it } from "vitest";
import { overlaps } from "@/modules/booking/domain/slots";

/**
 * Documents the concurrency invariant used by createBookingWithHold:
 * two occupied windows on the same location must not overlap.
 */
describe("booking concurrency invariant", () => {
  it("rejects overlapping occupied windows", () => {
    const a = {
      start: new Date("2026-11-03T14:50:00.000Z"),
      end: new Date("2026-11-03T16:15:00.000Z"),
    };
    const b = {
      start: new Date("2026-11-03T15:40:00.000Z"),
      end: new Date("2026-11-03T17:05:00.000Z"),
    };
    expect(overlaps(a, b)).toBe(true);
  });

  it("allows adjacent sessions after buffers", () => {
    const a = {
      start: new Date("2026-11-03T14:50:00.000Z"),
      end: new Date("2026-11-03T16:15:00.000Z"),
    };
    const b = {
      start: new Date("2026-11-03T16:15:00.000Z"),
      end: new Date("2026-11-03T17:30:00.000Z"),
    };
    expect(overlaps(a, b)).toBe(false);
  });
});
