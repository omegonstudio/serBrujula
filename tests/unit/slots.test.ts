import { describe, expect, it } from "vitest";
import {
  buildOccupiedWindow,
  generateSlotsForDay,
  localTimeToUtc,
  overlaps,
} from "@/modules/booking/domain/slots";

describe("booking slots", () => {
  it("builds occupied window with buffers", () => {
    const startsAt = new Date("2026-11-03T15:00:00.000Z");
    const win = buildOccupiedWindow({
      startsAt,
      durationMinutes: 60,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 15,
      travelBufferMinutes: 30,
    });
    expect(win.endsAt.toISOString()).toBe("2026-11-03T16:00:00.000Z");
    expect(win.occupiedStartsAt.toISOString()).toBe("2026-11-03T14:20:00.000Z");
    expect(win.occupiedEndsAt.toISOString()).toBe("2026-11-03T16:45:00.000Z");
  });

  it("detects overlap", () => {
    expect(
      overlaps(
        { start: new Date("2026-01-01T10:00:00Z"), end: new Date("2026-01-01T11:00:00Z") },
        { start: new Date("2026-01-01T10:30:00Z"), end: new Date("2026-01-01T12:00:00Z") },
      ),
    ).toBe(true);
    expect(
      overlaps(
        { start: new Date("2026-01-01T10:00:00Z"), end: new Date("2026-01-01T11:00:00Z") },
        { start: new Date("2026-01-01T11:00:00Z"), end: new Date("2026-01-01T12:00:00Z") },
      ),
    ).toBe(false);
  });

  it("generates slots excluding busy intervals", () => {
    // Tuesday 2026-11-03
    const start = localTimeToUtc(2026, 11, 3, "10:00");
    const busyStart = localTimeToUtc(2026, 11, 3, "10:00");
    const busyEnd = localTimeToUtc(2026, 11, 3, "12:00");
    const slots = generateSlotsForDay({
      year: 2026,
      month: 11,
      day: 3,
      rules: [{ dayOfWeek: 2, startTimeLocal: "10:00", endTimeLocal: "14:00" }],
      durationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      busy: [{ start: busyStart, end: busyEnd }],
      now: new Date("2026-11-01T00:00:00.000Z"),
      stepMinutes: 60,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(
      slots.every((s) => s.startsAt.getTime() >= busyEnd.getTime() || s.endsAt <= start),
    ).toBe(true);
    expect(slots.some((s) => s.startsAt.getTime() === busyStart.getTime())).toBe(false);
  });
});
