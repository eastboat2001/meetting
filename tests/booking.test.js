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
  makeBooking("booking_next", iso("2026-10-25", "08:30"), iso("2026-10-25", "09:30")),
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

assert.deepStrictEqual(
  booking.getBookingsByDate(existing, sampleDate).map((item) => item.id),
  ["booking_1", "booking_2"],
  "getBookingsByDate should return only bookings from the selected date"
);

assert.deepStrictEqual(
  booking.getBookingsByDateRange(existing, "2026-10-24", "2026-10-24").map((item) => item.id),
  ["booking_1", "booking_2"],
  "date range helper should include the whole end date"
);

const weekRange = booking.getWeekRange("2026-10-28");
assert.deepStrictEqual(
  weekRange.days.map((date) => booking.formatInputDate(date)),
  ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"],
  "week range should expose Monday-Friday work days"
);

assert.strictEqual(booking.isSameDate("2026-10-24", new Date("2026-10-24T22:00:00")), true);
assert.strictEqual(
  booking.isPastTime(new Date("2026-10-24T09:00:00"), new Date("2026-10-24T09:30:00")),
  true,
  "past time helper should detect earlier same-day times"
);

const selectedSegments = booking.getAvailabilitySegments(sampleDate, existing, booking.defaultRoomConfig);
assert.deepStrictEqual(
  selectedSegments.map((segment) => `${booking.minutesToTime(segment.start)}-${booking.minutesToTime(segment.end)}:${segment.type}`),
  [
    "08:00-09:00:available",
    "09:00-10:00:booked",
    "10:00-12:00:available",
    "12:00-13:00:lunch",
    "13:00-14:00:available",
    "14:00-15:00:booked",
    "15:00-17:00:available",
  ],
  "availability segments should combine bookings and lunch for the selected date"
);

const mergedWeekBlocks = booking.getMergedWeekBookingBlocks(
  [
    makeBooking("a", iso(sampleDate, "10:00"), iso(sampleDate, "10:30")),
    makeBooking("b", iso(sampleDate, "10:30"), iso(sampleDate, "11:00")),
    makeBooking("c", iso(sampleDate, "11:00"), iso(sampleDate, "12:00")),
    makeBooking("d", iso(sampleDate, "13:00"), iso(sampleDate, "13:30")),
    makeBooking("e", iso(sampleDate, "14:00"), iso(sampleDate, "14:30")),
  ],
  booking.defaultRoomConfig
);
assert.deepStrictEqual(
  mergedWeekBlocks.map((block) => ({
    start: booking.minutesToTime(block.start),
    end: booking.minutesToTime(block.end),
    ids: block.bookings.map((item) => item.id),
  })),
  [
    { start: "10:00", end: "12:00", ids: ["a", "b", "c"] },
    { start: "13:00", end: "13:30", ids: ["d"] },
    { start: "14:00", end: "14:30", ids: ["e"] },
  ],
  "adjacent week-view meetings should merge into one occupied color block"
);

const pastValidation = booking.validateBooking(
  {
    title: "Past",
    booker: "Ada",
    date: "2026-10-24",
    startTime: "08:00",
    endTime: "08:30",
    remark: "",
  },
  [],
  booking.defaultRoomConfig,
  null,
  new Date("2026-10-24T09:00:00")
);
assert.strictEqual(pastValidation.valid, false, "saving a past same-day start time should be invalid");
assert.match(pastValidation.errors.join("\n"), /past|过去/);

const conflictFeedback = booking.getBookingTimeFeedback(
  {
    date: sampleDate,
    startTime: "09:30",
    endTime: "10:30",
  },
  existing,
  booking.defaultRoomConfig,
  null,
  new Date("2026-10-01T09:00:00")
);
assert.match(conflictFeedback.map((item) => item.title).join("\n"), /conflicts|冲突/);

const lunchFeedback = booking.getBookingTimeFeedback(
  {
    date: sampleDate,
    startTime: "11:30",
    endTime: "13:30",
  },
  [],
  booking.defaultRoomConfig,
  null,
  new Date("2026-10-01T09:00:00")
);
assert.match(lunchFeedback.map((item) => item.title).join("\n"), /Lunch|午休/);

const holidayRequests = booking.getHolidayProviderRequests(
  booking.defaultRoomConfig,
  new Date("2026-06-02T08:00:00")
);
assert.deepStrictEqual(
  holidayRequests.map((request) => request.url),
  [
    "https://malaysia-holiday.dydxsoft.my/api/v1/holidays?year=2026",
    "https://malaysia-holiday.dydxsoft.my/api/v1/holidays?year=2027",
    "https://date.nager.at/api/v3/PublicHolidays/2026/CN",
    "https://date.nager.at/api/v3/PublicHolidays/2027/CN",
  ],
  "default holiday requests should fetch current and next year for Malaysia and China"
);

const normalizedNagerHolidays = booking.normalizeHolidayPayload(
  [
    {
      name: "Hari Malaysia",
      date: "2026-09-16",
      state_codes: ["KUL", "SGR"],
    },
    {
      name: "Hari Wilayah Persekutuan",
      date: "2026-02-01",
      state_codes: ["LBN"],
    },
  ],
  holidayRequests[0]
).concat(booking.normalizeHolidayPayload(
  [
    {
      date: "2026-10-01",
      localName: "National Day",
      name: "National Day",
      countryCode: "CN",
      global: true,
      types: ["Public"],
    },
    {
      date: "2026-10-02",
      localName: "National Day",
      name: "National Day",
      countryCode: "CN",
      global: true,
      types: ["Public"],
    },
    {
      date: "2026-01-01",
      localName: "Regional Test",
      name: "Regional Test",
      countryCode: "MY",
      global: false,
      types: ["Public"],
    },
  ],
  holidayRequests[2]
));
assert.deepStrictEqual(
  booking.mergeConsecutiveHolidays(normalizedNagerHolidays).map((holiday) => ({
    country: holiday.country,
    countryCn: holiday.countryCn,
    name: holiday.name,
    nameCn: holiday.nameCn,
    startDate: holiday.startDate,
    endDate: holiday.endDate,
    source: holiday.source,
  })),
  [
    {
      country: "Malaysia",
      countryCn: "马来西亚",
      name: "Malaysia Day",
      nameCn: "马来西亚日",
      startDate: "2026-09-16",
      endDate: "2026-09-16",
      source: "malaysia-holiday",
    },
    {
      country: "China",
      countryCn: "中国",
      name: "National Day",
      nameCn: "中国国庆节",
      startDate: "2026-10-01",
      endDate: "2026-10-02",
      source: "nager-date",
    },
  ],
  "holiday provider payloads should normalize, translate, filter regional items, and merge consecutive dates"
);

const exportedWorkbook = booking.createMeetingRecordsWorkbook(
  [
    {
      id: "booking_export_1",
      title: "Planning & Review / 规划评审",
      booker: "Ada <Lead>",
      start: iso("2026-06-02", "09:30"),
      end: iso("2026-06-02", "10:30"),
      remark: "Discuss scope & risks",
      createdAt: iso("2026-06-01", "18:00"),
      updatedAt: iso("2026-06-01", "18:30"),
    },
  ],
  new Date(iso("2026-06-02", "08:00"))
);
const workbookText = Buffer.from(exportedWorkbook.bytes).toString("utf8");
assert.strictEqual(
  exportedWorkbook.fileName,
  "aihero-meeting-records-2026-06-02.xlsx",
  "meeting record export should use an xlsx filename"
);
assert.strictEqual(
  exportedWorkbook.mimeType,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "meeting record export should use the official xlsx MIME type"
);
assert.ok(workbookText.startsWith("PK"), "meeting record export should be an xlsx zip package");
assert.ok(workbookText.includes("xl/worksheets/sheet1.xml"), "xlsx package should include a worksheet");
assert.ok(workbookText.includes("Meeting Name / 会议名称"), "worksheet should include meeting-record headers");
assert.ok(workbookText.includes("Duration / 时长"), "worksheet should include meeting duration");
assert.ok(workbookText.includes("1h"), "worksheet should include the calculated meeting duration");
assert.ok(workbookText.includes("Planning &amp; Review / 规划评审"), "worksheet should XML-escape meeting names");
assert.ok(workbookText.includes("Ada &lt;Lead&gt;"), "worksheet should XML-escape booker names");
assert.ok(workbookText.includes("Discuss scope &amp; risks"), "worksheet should include meeting remarks");
assert.ok(!workbookText.includes("Created At / 创建时间"), "xlsx export should not include internal creation metadata");
assert.ok(!workbookText.includes("Updated At / 更新时间"), "xlsx export should not include internal update metadata");
assert.ok(!workbookText.includes("roomConfig"), "xlsx export should not include room configuration");
assert.ok(!workbookText.includes("holidayCache"), "xlsx export should not include holiday cache");
assert.ok(!workbookText.includes("holidayLastUpdated"), "xlsx export should not include holiday refresh state");

console.log("All booking logic tests passed.");
