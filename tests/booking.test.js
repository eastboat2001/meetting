const assert = require("assert");

const booking = require("../app.js");

function iso(date, time) {
  return `${date}T${time}:00`;
}

function makeBooking(id, start, end) {
  return {
    id,
    title: `Meeting ${id}`,
    booker: "Tester",
    start,
    end,
    remark: "",
    createdAt: start,
    updatedAt: start,
  };
}

const sampleDate = "2026-10-24";
const existing = [
  makeBooking("booking_1", iso(sampleDate, "09:00"), iso(sampleDate, "10:00")),
  makeBooking("booking_2", iso(sampleDate, "14:00"), iso(sampleDate, "15:00")),
];

assert.strictEqual(
  booking.hasTimeConflict(
    { start: iso(sampleDate, "09:30"), end: iso(sampleDate, "10:30") },
    existing
  ),
  true,
  "overlapping meeting should conflict"
);

assert.strictEqual(
  booking.hasTimeConflict(
    { start: iso(sampleDate, "10:00"), end: iso(sampleDate, "10:30") },
    existing
  ),
  false,
  "touching end/start boundaries should not conflict"
);

assert.strictEqual(
  booking.hasTimeConflict(
    { start: iso(sampleDate, "09:30"), end: iso(sampleDate, "10:30") },
    existing,
    "booking_1"
  ),
  false,
  "editing should ignore the current booking"
);

assert.strictEqual(
  booking.overlapsLunch(
    new Date(iso(sampleDate, "11:30")),
    new Date(iso(sampleDate, "12:30")),
    booking.defaultRoomConfig
  ),
  true,
  "meeting overlapping 12:00-13:00 should be rejected"
);

assert.strictEqual(
  booking.overlapsLunch(
    new Date(iso(sampleDate, "11:00")),
    new Date(iso(sampleDate, "12:00")),
    booking.defaultRoomConfig
  ),
  false,
  "meeting ending at lunch start should be allowed"
);

assert.strictEqual(
  booking.isWithinBusinessHours(
    new Date(iso(sampleDate, "07:30")),
    new Date(iso(sampleDate, "08:30")),
    booking.defaultRoomConfig
  ),
  false,
  "meeting before 08:00 should be rejected"
);

assert.strictEqual(
  booking.isWithinBusinessHours(
    new Date(iso(sampleDate, "16:30")),
    new Date(iso(sampleDate, "17:00")),
    booking.defaultRoomConfig
  ),
  true,
  "meeting ending at 17:00 should be allowed"
);

assert.deepStrictEqual(
  booking
    .sortBookings([
      makeBooking("b", iso(sampleDate, "15:00"), iso(sampleDate, "16:00")),
      makeBooking("a", iso(sampleDate, "08:00"), iso(sampleDate, "08:30")),
    ])
    .map((item) => item.id),
  ["a", "b"],
  "bookings should sort by start time ascending"
);

const validation = booking.validateBooking(
  {
    title: "Planning",
    booker: "Ada",
    date: sampleDate,
    startTime: "14:30",
    endTime: "15:30",
    remark: "",
  },
  existing,
  booking.defaultRoomConfig
);

assert.strictEqual(validation.valid, false, "overlapping save should be invalid");
assert.match(validation.errors.join("\n"), /conflicts|冲突/);

console.log("All booking logic tests passed.");
