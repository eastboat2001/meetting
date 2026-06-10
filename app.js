(function attachAIHeroBooking(root, factory) {
  const api = factory(root || {});
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.AIHeroBooking = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createApp(root) {
  "use strict";

  const STORAGE_KEYS = {
    bookings: "aihero_bookings",
    roomConfig: "aihero_room_config",
    holidayCache: "aihero_holiday_cache",
    holidayLastUpdated: "aihero_holiday_last_updated",
  };

  const NAGER_DATE_API_BASE = "https://date.nager.at/api/v3/PublicHolidays";
  const MALAYSIA_HOLIDAY_API_BASE = "https://malaysia-holiday.dydxsoft.my/api/v1/holidays";
  const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const meetingRecordExportHeaders = [
    "Date / 日期",
    "Start Time / 开始时间",
    "End Time / 结束时间",
    "Duration / 时长",
    "Meeting Name / 会议名称",
    "Booker / 预订人",
    "Remark / 备注",
  ];
  const defaultHolidayCountries = [
    { code: "MY", name: "Malaysia", nameCn: "马来西亚", source: "malaysia-holiday", stateCode: "KUL" },
    { code: "CN", name: "China", nameCn: "中国" },
  ];
  const holidayCountryMeta = {
    MY: { code: "MY", name: "Malaysia", nameCn: "马来西亚", source: "malaysia-holiday", stateCode: "KUL" },
    CN: { code: "CN", name: "China", nameCn: "中国" },
  };
  const malaysiaStateCodeCount = 16;
  const malaysiaHolidayNameEn = {
    "Tahun Baharu": "New Year's Day",
    "Tahun Baharu Cina": "Chinese New Year",
    "Tahun Baharu Cina (Hari Kedua)": "Chinese New Year",
    "Hari Raya Aidilfitri": "Hari Raya Aidilfitri",
    "Hari Raya Aidilfitri (Hari Kedua)": "Hari Raya Aidilfitri",
    "Hari Raya Haji": "Hari Raya Haji",
    "Hari Deepavali": "Deepavali",
    "Hari Krismas": "Christmas Day",
    "Hari Kebangsaan": "National Day",
    "Hari Malaysia": "Malaysia Day",
    "Awal Muharam (Maal Hijrah)": "Awal Muharram",
    "Hari Keputeraan Nabi Muhammad S.A.W. (Maulidur Rasul)": "Mawlid al-Nabi",
    "Hari Wesak": "Wesak Day",
    "Hari Pekerja": "Labour Day",
    "Hari Keputeraan Seri Paduka Baginda Yang di-Pertuan Agong": "Birthday of SPB Yang di Pertuan Agong",
  };
  const holidayNameCn = {
    "New Year's Day": "元旦",
    "Chinese New Year": "春节",
    "Lunar New Year": "春节",
    "Spring Festival": "春节",
    "Ching Ming Festival": "清明节",
    "Qingming Festival": "清明节",
    "Labour Day": "劳动节",
    "Labor Day": "劳动节",
    "Dragon Boat Festival": "端午节",
    "Mid-Autumn Festival": "中秋节",
    "National Day": "国庆日",
    "CN:National Day": "中国国庆节",
    "MY:National Day": "国庆日",
    "Malaysia Day": "马来西亚日",
    "Christmas Day": "圣诞节",
    Christmas: "圣诞节",
    "Hari Raya Puasa": "开斋节",
    "Hari Raya Aidilfitri": "开斋节",
    "Hari Raya Haji": "哈芝节",
    "Hari Raya Aidiladha": "哈芝节",
    "Tahun Baharu": "元旦",
    "Tahun Baharu Cina": "春节",
    "Tahun Baharu Cina (Hari Kedua)": "春节",
    "Hari Deepavali": "屠妖节",
    "Hari Krismas": "圣诞节",
    "Hari Kebangsaan": "国庆日",
    "Hari Malaysia": "马来西亚日",
    "Awal Muharam (Maal Hijrah)": "回历元旦",
    "Hari Keputeraan Nabi Muhammad S.A.W. (Maulidur Rasul)": "先知诞辰",
    "Hari Wesak": "卫塞节",
    "Hari Pekerja": "劳动节",
    "Hari Keputeraan Seri Paduka Baginda Yang di-Pertuan Agong": "国家元首诞辰",
    "Vesak Day": "卫塞节",
    "Wesak Day": "卫塞节",
    Deepavali: "屠妖节",
    Thaipusam: "大宝森节",
    "Good Friday": "耶稣受难日",
    "Awal Muharram": "回历元旦",
    "Mawlid al-Nabi": "先知诞辰",
    "Birthday of SPB Yang di Pertuan Agong": "国家元首诞辰",
  };

  const defaultRoomConfig = {
    appName: "AI英雄汇",
    roomName: "AI英雄汇",
    capacity: 12,
    features: ["Display", "Camera", "Wi-Fi"],
    businessStart: "08:00",
    businessEnd: "17:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    timeSlotMinutes: 30,
    holidayRefreshDays: 30,
    holidayCountries: defaultHolidayCountries.map((country) => ({ ...country })),
    holidayProviders: [],
  };

  const defaultHolidayData = [
    {
      country: "Malaysia",
      countryCn: "马来西亚",
      name: "National Day",
      nameCn: "国庆日",
      startDate: "2026-08-31",
      endDate: "2026-08-31",
      source: "builtin",
    },
    {
      country: "Malaysia",
      countryCn: "马来西亚",
      name: "Malaysia Day",
      nameCn: "马来西亚日",
      startDate: "2026-09-16",
      endDate: "2026-09-16",
      source: "builtin",
    },
    {
      country: "China",
      countryCn: "中国",
      name: "Mid-Autumn Festival",
      nameCn: "中秋节",
      startDate: "2026-09-25",
      endDate: "2026-09-25",
      source: "builtin",
    },
    {
      country: "China",
      countryCn: "中国",
      name: "National Day",
      nameCn: "中国国庆节",
      startDate: "2026-10-01",
      endDate: "2026-10-07",
      source: "builtin",
    },
    {
      country: "Malaysia",
      countryCn: "马来西亚",
      name: "Deepavali",
      nameCn: "屠妖节",
      startDate: "2026-11-08",
      endDate: "2026-11-08",
      source: "builtin",
    },
    {
      country: "Malaysia",
      countryCn: "马来西亚",
      name: "Christmas",
      nameCn: "圣诞节",
      startDate: "2026-12-25",
      endDate: "2026-12-25",
      source: "builtin",
    },
    {
      country: "China",
      countryCn: "中国",
      name: "New Year's Day",
      nameCn: "元旦",
      startDate: "2027-01-01",
      endDate: "2027-01-01",
      source: "builtin",
    },
    {
      country: "China",
      countryCn: "中国",
      name: "Spring Festival",
      nameCn: "春节",
      startDate: "2027-02-06",
      endDate: "2027-02-12",
      source: "builtin",
    },
    {
      country: "Malaysia",
      countryCn: "马来西亚",
      name: "Hari Raya Puasa",
      nameCn: "开斋节",
      startDate: "2027-03-10",
      endDate: "2027-03-11",
      source: "builtin",
    },
  ];

  const WEEKDAYS_EN = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const WEEKDAYS_CN = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const avatarColors = ["#7658d6", "#1fad59", "#0d63db", "#dd4b0a", "#0f9f8e", "#be3bd7"];

  const state = {
    bookings: [],
    roomConfig: { ...defaultRoomConfig },
    holidays: defaultHolidayData.slice(),
    detailBookingId: null,
    previewDate: new Date(),
    previewView: "week",
    toastTimer: null,
  };

  function getStorage() {
    try {
      if (root && root.localStorage) {
        return root.localStorage;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  function readJson(key, fallback) {
    const storage = getStorage();
    if (!storage) {
      return fallback;
    }
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn(`Invalid localStorage data for ${key}`, error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    storage.setItem(key, JSON.stringify(value));
  }

  function loadBookings() {
    const data = readJson(STORAGE_KEYS.bookings, []);
    if (!Array.isArray(data)) {
      return [];
    }
    return sortBookings(data.filter(isBookingLike));
  }

  function saveBookings(bookings) {
    writeJson(STORAGE_KEYS.bookings, sortBookings(bookings.filter(isBookingLike)));
  }

  function loadRoomConfig() {
    const stored = readJson(STORAGE_KEYS.roomConfig, {});
    return {
      ...defaultRoomConfig,
      ...(stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}),
    };
  }

  function saveRoomConfig(config) {
    writeJson(STORAGE_KEYS.roomConfig, { ...defaultRoomConfig, ...config });
  }

  function loadHolidayCache() {
    const data = readJson(STORAGE_KEYS.holidayCache, null);
    return Array.isArray(data) ? data.filter(isHolidayLike) : null;
  }

  function saveHolidayCache(data) {
    writeJson(STORAGE_KEYS.holidayCache, data.filter(isHolidayLike));
  }

  function loadHolidayLastUpdated() {
    const storage = getStorage();
    return storage ? storage.getItem(STORAGE_KEYS.holidayLastUpdated) : null;
  }

  function saveHolidayLastUpdated(date = new Date()) {
    const storage = getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEYS.holidayLastUpdated, date.toISOString());
    }
  }

  function shouldRefreshHolidays(now = new Date(), config = loadRoomConfig()) {
    const lastUpdated = loadHolidayLastUpdated();
    if (!lastUpdated) {
      return true;
    }
    const lastDate = new Date(lastUpdated);
    if (Number.isNaN(lastDate.getTime())) {
      return true;
    }
    const days = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    return days >= Number(config.holidayRefreshDays || defaultRoomConfig.holidayRefreshDays);
  }

  async function refreshHolidaysIfNeeded() {
    const cached = loadHolidayCache();
    const config = loadRoomConfig();
    if (!shouldRefreshHolidays(new Date(), config) && hasRealHolidaySource(cached)) {
      return cached && cached.length ? cached : defaultHolidayData.slice();
    }

    const fetched = await fetchHolidayProviders(getHolidayProviderRequests(config, new Date()));
    if (fetched.length) {
      saveHolidayCache(fetched);
      saveHolidayLastUpdated();
      return fetched;
    }

    if (cached && cached.length) {
      return cached;
    }

    saveHolidayCache(defaultHolidayData);
    saveHolidayLastUpdated();
    return defaultHolidayData.slice();
  }

  function getHolidayProviderRequests(config = defaultRoomConfig, now = new Date()) {
    const years = [now.getFullYear(), now.getFullYear() + 1];
    const countryRequests = getConfiguredHolidayCountries(config).flatMap((country) =>
      years.map((year) => getHolidayProviderRequest(country, year))
    );
    const customRequests = Array.isArray(config.holidayProviders)
      ? config.holidayProviders
          .filter((provider) => typeof provider === "string" && provider.trim())
          .map((url) => ({ url: url.trim(), source: "custom" }))
      : [];
    return countryRequests.concat(customRequests);
  }

  function getHolidayProviderRequest(country, year) {
    if (country.source === "malaysia-holiday" || country.code === "MY") {
      return {
        url: `${MALAYSIA_HOLIDAY_API_BASE}?year=${year}`,
        source: "malaysia-holiday",
        country,
        year,
      };
    }
    return {
      url: `${NAGER_DATE_API_BASE}/${year}/${country.code}`,
      source: "nager-date",
      country,
      year,
    };
  }

  function hasRealHolidaySource(holidays) {
    return Boolean(
      Array.isArray(holidays) &&
        holidays.some((holiday) => holiday.source === "nager-date" || holiday.source === "malaysia-holiday")
    );
  }

  function getConfiguredHolidayCountries(config = defaultRoomConfig) {
    const countries =
      Array.isArray(config.holidayCountries) && config.holidayCountries.length
        ? config.holidayCountries
        : defaultHolidayCountries;
    return countries.map(getHolidayCountryMeta).filter((country) => country.code);
  }

  function getHolidayCountryMeta(country) {
    const rawCode = typeof country === "string" ? country : country?.code;
    const code = String(rawCode || "").trim().toUpperCase();
    if (!code) {
      return { code: "", name: "", nameCn: "" };
    }
    const base = holidayCountryMeta[code] || { code, name: code, nameCn: code };
    return {
      ...base,
      ...(country && typeof country === "object" ? country : {}),
      code,
    };
  }

  async function fetchHolidayProviders(providers) {
    if (!Array.isArray(providers) || !providers.length || typeof fetch !== "function") {
      return [];
    }

    const requests = providers
      .map((provider) =>
        typeof provider === "string" ? { url: provider.trim(), source: "custom" } : provider
      )
      .filter((provider) => provider && typeof provider.url === "string" && provider.url.trim());
    const holidays = [];
    for (const provider of requests) {
      try {
        const payload = await fetchHolidayProviderPayload(provider);
        holidays.push(...normalizeHolidayPayload(payload, provider));
      } catch (error) {
        console.warn("Holiday provider failed", provider.url, error);
      }
    }

    return mergeConsecutiveHolidays(holidays.filter(isHolidayLike));
  }

  async function fetchHolidayProviderPayload(provider, attempts = 2) {
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await fetch(provider.url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Holiday provider failed: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  function normalizeHolidayPayload(payload, provider = {}) {
    const holidays = Array.isArray(payload)
      ? payload
      : payload && Array.isArray(payload.holidays)
        ? payload.holidays
        : payload && Array.isArray(payload.data)
          ? payload.data
          : [];
    if (provider.source === "malaysia-holiday" || holidays.some(isMalaysiaHolidayItem)) {
      return holidays
        .map((holiday) => normalizeMalaysiaHoliday(holiday, provider.country))
        .filter(Boolean);
    }
    if (provider.source === "nager-date" || holidays.some(isNagerHolidayItem)) {
      return holidays.map((holiday) => normalizeNagerHoliday(holiday, provider.country)).filter(Boolean);
    }
    return holidays;
  }

  function isMalaysiaHolidayItem(item) {
    return Boolean(item && typeof item.date === "string" && Array.isArray(item.state_codes));
  }

  function isNagerHolidayItem(item) {
    return Boolean(item && typeof item.date === "string" && typeof item.name === "string");
  }

  function normalizeMalaysiaHoliday(item, providerCountry = null) {
    if (!item || !item.date || typeof item.name !== "string") {
      return null;
    }
    const country = getHolidayCountryMeta(providerCountry || "MY");
    if (!isMalaysiaHolidayObserved(item, country)) {
      return null;
    }
    const name = malaysiaHolidayNameEn[item.name] || item.name;
    return {
      country: country.name,
      countryCn: country.nameCn,
      name,
      nameCn: getHolidayNameCn({ name, localName: item.name }, country.code),
      startDate: item.date,
      endDate: item.date,
      source: "malaysia-holiday",
    };
  }

  function isMalaysiaHolidayObserved(item, country) {
    if (!Array.isArray(item.state_codes)) {
      return true;
    }
    const stateCode = String(country.stateCode || "").toUpperCase();
    if (stateCode) {
      return item.state_codes.includes(stateCode);
    }
    return item.state_codes.length >= malaysiaStateCodeCount;
  }

  function normalizeNagerHoliday(item, providerCountry = null) {
    if (!item || item.global === false) {
      return null;
    }
    if (Array.isArray(item.types) && !item.types.includes("Public")) {
      return null;
    }
    const countryCode = String(item.countryCode || providerCountry?.code || "").toUpperCase();
    const country = getHolidayCountryMeta(countryCode);
    const name = String(item.name || item.localName || "").trim();
    if (!name || !item.date || !country.code) {
      return null;
    }
    return {
      country: country.name,
      countryCn: country.nameCn,
      name,
      nameCn: getHolidayNameCn(item, country.code),
      startDate: item.date,
      endDate: item.date,
      source: "nager-date",
    };
  }

  function getHolidayNameCn(item, countryCode) {
    const countryKey = `${countryCode}:${item.name}`;
    if (holidayNameCn[countryKey]) {
      return holidayNameCn[countryKey];
    }
    if (holidayNameCn[item.name]) {
      return holidayNameCn[item.name];
    }
    if (holidayNameCn[item.localName]) {
      return holidayNameCn[item.localName];
    }
    if (/[\u3400-\u9fff]/.test(item.localName || "")) {
      return item.localName;
    }
    return item.localName || item.name;
  }

  function mergeConsecutiveHolidays(holidays) {
    return holidays
      .filter(isHolidayLike)
      .map((holiday) => ({ ...holiday, endDate: holiday.endDate || holiday.startDate }))
      .sort((a, b) => {
        const byDate = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        if (byDate) {
          return byDate;
        }
        return `${a.country}:${a.name}`.localeCompare(`${b.country}:${b.name}`);
      })
      .reduce((merged, holiday) => {
        const previous = merged[merged.length - 1];
        if (
          previous &&
          previous.country === holiday.country &&
          previous.name === holiday.name &&
          isNextCalendarDate(previous.endDate, holiday.startDate)
        ) {
          previous.endDate = holiday.endDate;
          return merged;
        }
        merged.push(holiday);
        return merged;
      }, []);
  }

  function isNextCalendarDate(endDate, startDate) {
    const next = addDays(parseDateOnly(endDate), 1);
    return formatInputDate(next) === formatInputDate(parseDateOnly(startDate));
  }

  function isHolidayLike(item) {
    return Boolean(
      item &&
        typeof item.country === "string" &&
        typeof item.countryCn === "string" &&
        typeof item.name === "string" &&
        typeof item.nameCn === "string" &&
        typeof item.startDate === "string"
    );
  }

  function isBookingLike(item) {
    return Boolean(
      item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.booker === "string" &&
        typeof item.start === "string" &&
        typeof item.end === "string"
    );
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function parseTimeToMinutes(time) {
    const match = /^(\d{2}):(\d{2})$/.exec(time || "");
    if (!match) {
      return NaN;
    }
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function minutesToTime(minutes) {
    return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
  }

  function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  function createLocalDateTime(dateValue, timeValue) {
    const dateParts = String(dateValue || "")
      .split("-")
      .map(Number);
    const timeParts = String(timeValue || "")
      .split(":")
      .map(Number);
    if (dateParts.length !== 3 || timeParts.length !== 2) {
      return new Date(NaN);
    }
    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], 0, 0);
  }

  function parseDateOnly(value) {
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    return createLocalDateTime(formatInputDate(new Date(`${value}T00:00:00`)), "00:00");
  }

  function toLocalIso(date) {
    return `${formatInputDate(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;
  }

  function formatInputDate(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function formatTimeOnly(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "--:--";
    }
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }

  function formatDateLines(date) {
    return {
      en: `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())} ${WEEKDAYS_EN[date.getDay()]}`,
      cn: `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS_CN[date.getDay()]}`,
    };
  }

  function sortBookings(bookings) {
    return bookings.slice().sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  function getBookingsForDate(bookings, date = new Date()) {
    const dateKey = typeof date === "string" ? date : formatInputDate(date);
    return sortBookings(bookings).filter((booking) => formatInputDate(new Date(booking.start)) === dateKey);
  }

  function getBookingsByDate(bookings, date = new Date()) {
    return getBookingsForDate(bookings, date);
  }

  function getBookingsByDateRange(bookings, startDate, endDate) {
    const start = parseDateOnly(startDate);
    const end = addDays(parseDateOnly(endDate), 1);
    return sortBookings(bookings).filter((booking) => {
      const bookingStart = new Date(booking.start);
      return bookingStart >= start && bookingStart < end;
    });
  }

  function isSameDate(dateA, dateB) {
    return formatInputDate(parseDateOnly(dateA)) === formatInputDate(parseDateOnly(dateB));
  }

  function isPastTime(dateTime, now = new Date()) {
    const value = dateTime instanceof Date ? dateTime : new Date(dateTime);
    return !Number.isNaN(value.getTime()) && value < now;
  }

  function getWeekRange(date = new Date()) {
    const target = parseDateOnly(date);
    const day = target.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = addDays(target, mondayOffset);
    const days = Array.from({ length: 5 }, (_, index) => addDays(start, index));
    return {
      start,
      end: days[days.length - 1],
      startDate: formatInputDate(start),
      endDate: formatInputDate(days[days.length - 1]),
      days,
    };
  }

  function getTodayBookings(bookings, now = new Date()) {
    return getBookingsForDate(bookings, now);
  }

  function getCurrentBooking(bookings, now = new Date()) {
    return getTodayBookings(bookings, now).find((booking) => {
      const start = new Date(booking.start);
      const end = new Date(booking.end);
      return start <= now && now < end;
    });
  }

  function getNextBooking(bookings, now = new Date()) {
    return getTodayBookings(bookings, now).find((booking) => new Date(booking.start) > now);
  }

  function getBookingStatus(booking, now = new Date()) {
    const start = new Date(booking.start);
    const end = new Date(booking.end);
    if (now >= end) {
      return "ended";
    }
    if (start <= now && now < end) {
      return "active";
    }
    return "upcoming";
  }

  function getBookingStatusLabel(booking, now = new Date()) {
    const status = getBookingStatus(booking, now);
    if (status === "active") {
      return "In progress / 进行中";
    }
    if (status === "ended") {
      return "Ended / 已结束";
    }
    return "Upcoming / 未开始";
  }

  function overlaps(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
  }

  function overlapsLunch(start, end, config = defaultRoomConfig) {
    const lunchStart = createLocalDateTime(formatInputDate(start), config.lunchStart);
    const lunchEnd = createLocalDateTime(formatInputDate(start), config.lunchEnd);
    return overlaps(start, end, lunchStart, lunchEnd);
  }

  function isWithinBusinessHours(start, end, config = defaultRoomConfig) {
    if (formatInputDate(start) !== formatInputDate(end)) {
      return false;
    }
    const businessStart = createLocalDateTime(formatInputDate(start), config.businessStart);
    const businessEnd = createLocalDateTime(formatInputDate(start), config.businessEnd);
    return start >= businessStart && end <= businessEnd;
  }

  function isAlignedToSlot(date, config = defaultRoomConfig) {
    const minutes = minutesSinceMidnight(date);
    return minutes % Number(config.timeSlotMinutes || 30) === 0;
  }

  function hasTimeConflict(newBooking, existingBookings, editingId = null) {
    const newStart = new Date(newBooking.start);
    const newEnd = new Date(newBooking.end);
    return existingBookings.some((existing) => {
      if (editingId && existing.id === editingId) {
        return false;
      }
      const existingStart = new Date(existing.start);
      const existingEnd = new Date(existing.end);
      return overlaps(newStart, newEnd, existingStart, existingEnd);
    });
  }

  function validateBooking(
    formData,
    existingBookings = [],
    config = defaultRoomConfig,
    editingId = null,
    now = new Date()
  ) {
    const errors = [];
    const title = String(formData.title || "").trim();
    const booker = String(formData.booker || "").trim();
    const date = String(formData.date || "").trim();
    const startTime = String(formData.startTime || "").trim();
    const endTime = String(formData.endTime || "").trim();
    const remark = String(formData.remark || "").trim();

    if (!title) {
      errors.push("Meeting name is required. / 会议名称不能为空。");
    }
    if (!booker) {
      errors.push("Booker is required. / 预订人不能为空。");
    }
    if (!date || !startTime || !endTime) {
      errors.push("Meeting time is required. / 会议时间不能为空。");
    }

    const start = createLocalDateTime(date, startTime);
    const end = createLocalDateTime(date, endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      errors.push("Meeting time is invalid. / 会议时间无效。");
    } else {
      if (end <= start) {
        errors.push("End time must be later than start time. / 结束时间必须晚于开始时间。");
      }
      if (!isAlignedToSlot(start, config) || !isAlignedToSlot(end, config)) {
        errors.push("Meeting time must use 30-minute slots. / 会议时间必须按 30 分钟粒度选择。");
      }
      if (!isWithinBusinessHours(start, end, config)) {
        errors.push("Meeting must be within 08:00 - 17:00. / 会议必须在 08:00 - 17:00 内。");
      }
      if (isPastTime(start, now)) {
        errors.push("Meeting cannot start in the past. / 会议开始时间不能早于当前时间。");
      }
      if (overlapsLunch(start, end, config)) {
        errors.push("Meeting cannot overlap lunch 12:00 - 13:00. / 会议不能与 12:00 - 13:00 午休重叠。");
      }
      const draft = {
        start: toLocalIso(start),
        end: toLocalIso(end),
      };
      if (hasTimeConflict(draft, existingBookings, editingId)) {
        errors.push("Meeting time conflicts with an existing booking. / 会议时间与已有预订冲突。");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      booking: {
        title,
        booker,
        start: Number.isNaN(start.getTime()) ? "" : toLocalIso(start),
        end: Number.isNaN(end.getTime()) ? "" : toLocalIso(end),
        remark,
      },
    };
  }

  function generateBookingId() {
    const randomPart = Math.random().toString(36).slice(2, 8);
    return `booking_${Date.now()}_${randomPart}`;
  }

  function getDefaultTimeRange(now = new Date(), config = defaultRoomConfig) {
    const slot = Number(config.timeSlotMinutes || 30);
    const businessStart = parseTimeToMinutes(config.businessStart);
    const businessEnd = parseTimeToMinutes(config.businessEnd);
    const lunchStart = parseTimeToMinutes(config.lunchStart);
    const lunchEnd = parseTimeToMinutes(config.lunchEnd);
    let date = new Date(now);
    let startMinutes = Math.ceil(minutesSinceMidnight(now) / slot) * slot;

    if (startMinutes < businessStart) {
      startMinutes = businessStart;
    }
    if (startMinutes >= lunchStart && startMinutes < lunchEnd) {
      startMinutes = lunchEnd;
    }
    if (startMinutes + slot > businessEnd) {
      date = addDays(date, 1);
      startMinutes = businessStart;
    }

    return {
      date: formatInputDate(date),
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(startMinutes + slot),
    };
  }

  function getFutureHolidays(holidays, now = new Date()) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return holidays
      .filter((holiday) => {
        const end = new Date(holiday.endDate || holiday.startDate);
        return end >= today;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  function formatHolidayDate(holiday) {
    const start = new Date(holiday.startDate);
    const end = new Date(holiday.endDate || holiday.startDate);
    const startLabel = `${start.toLocaleString("en-US", { month: "short" })} ${start.getDate()}`;
    if (formatInputDate(start) === formatInputDate(end)) {
      return startLabel;
    }
    const endLabel = `${end.toLocaleString("en-US", { month: "short" })} ${end.getDate()}`;
    return `${startLabel} - ${endLabel}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function initials(name) {
    const trimmed = String(name || "").trim();
    if (!trimmed) {
      return "?";
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }

  function avatarColor(value) {
    const source = String(value || "");
    const index =
      source.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarColors.length;
    return avatarColors[index];
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function setHtml(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = value;
    }
  }

  function showDialog(dialog) {
    dialog.classList.remove("closing");
    dialog.showModal();
  }

  function closeDialog(dialog, afterClose) {
    if (!dialog || !dialog.open) {
      if (typeof afterClose === "function") {
        afterClose();
      }
      return;
    }
    dialog.classList.add("closing");
    window.setTimeout(() => {
      dialog.classList.remove("closing");
      if (dialog.open) {
        dialog.close();
      }
      if (typeof afterClose === "function") {
        afterClose();
      }
    }, 180);
  }

  function renderApp() {
    state.bookings = loadBookings();
    state.roomConfig = loadRoomConfig();
    state.holidays = loadHolidayCache() || state.holidays || defaultHolidayData.slice();

    renderStatusPanel();
    renderScheduleTable();
    renderNextMeetingCard();
    renderRoomDetailsCard();
    renderAvailabilityTimeline();
    renderHolidayList();
  }

  function renderStatusPanel() {
    const now = new Date();
    const current = getCurrentBooking(state.bookings, now);
    const status = document.getElementById("room-status");
    const dateLines = formatDateLines(now);

    setText("app-name", state.roomConfig.appName || defaultRoomConfig.appName);
    setText("current-time", formatTimeOnly(now));
    setText("date-en", dateLines.en);
    setText("date-cn", dateLines.cn);

    if (status) {
      status.classList.toggle("status-in-use", Boolean(current));
      status.classList.toggle("status-available", !current);
      status.querySelector("span:last-child").textContent = current
        ? "In Use / 使用中"
        : "Available / 空闲";
    }
  }

  function renderScheduleTable() {
    const body = document.getElementById("schedule-body");
    if (!body) {
      return;
    }

    const now = new Date();
    const meetings = getTodayBookings(state.bookings, now);
    if (!meetings.length) {
      body.innerHTML = `
        <tr class="empty-row">
          <td colspan="3">No meetings today<br />今日暂无会议</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = meetings
      .map((meeting) => {
        const status = getBookingStatus(meeting, now);
        const avatar = initials(meeting.booker);
        return `
          <tr class="schedule-row ${status}" data-booking-id="${escapeHtml(meeting.id)}" tabindex="0">
            <td class="time-cell">${formatTimeOnly(meeting.start)} - ${formatTimeOnly(meeting.end)}</td>
            <td>
              <p class="meeting-title">${escapeHtml(meeting.title)}</p>
              <p class="meeting-remark">${escapeHtml(meeting.remark || "No remark / 无备注")}</p>
            </td>
            <td class="booker-cell">
              <span class="booker-wrap">
                <span class="avatar" style="background:${avatarColor(meeting.booker)}">${escapeHtml(avatar)}</span>
                <span>${escapeHtml(meeting.booker)}</span>
              </span>
            </td>
          </tr>
        `;
      })
      .join("");

    body.querySelectorAll(".schedule-row").forEach((row) => {
      row.addEventListener("click", () => openBookingDetailModal(row.dataset.bookingId));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openBookingDetailModal(row.dataset.bookingId);
        }
      });
    });
  }

  function renderNextMeetingCard() {
    const next = getNextBooking(state.bookings, new Date());
    if (!next) {
      setHtml(
        "next-meeting-content",
        `<p class="empty-text">No upcoming meeting today<br />今日暂无后续会议</p>`
      );
      return;
    }

    setHtml(
      "next-meeting-content",
      `
        <p class="next-title">${escapeHtml(next.title)}</p>
        <p class="next-time">◷ ${formatTimeOnly(next.start)} - ${formatTimeOnly(next.end)}</p>
      `
    );
  }

  function renderRoomDetailsCard() {
    const features = [
      `${Number(state.roomConfig.capacity || defaultRoomConfig.capacity)} Ppl`,
      ...(state.roomConfig.features || []),
    ];
    const iconMap = {
      Display: "monitor",
      Camera: "video",
      "Wi-Fi": "wifi",
    };

    setHtml(
      "room-details-content",
      features
        .map((feature) => {
          const iconId = feature.endsWith(" Ppl") ? "users" : iconMap[feature] || "info";
          return `
            <span class="feature-item">
              <svg class="ui-icon feature-icon" aria-hidden="true" focusable="false">
                <use href="#icon-${iconId}"></use>
              </svg>
              <span>${escapeHtml(feature)}</span>
            </span>
          `;
        })
        .join("")
    );
  }

  function renderAvailabilityTimeline() {
    const timeline = document.getElementById("availability-timeline");
    const pointer = document.getElementById("time-pointer");
    if (!timeline || !pointer) {
      return;
    }

    const now = new Date();
    const segments = getTimelineSegments(getTodayBookings(state.bookings, now), now, state.roomConfig);
    const totalMinutes =
      parseTimeToMinutes(state.roomConfig.businessEnd) - parseTimeToMinutes(state.roomConfig.businessStart);

    timeline.innerHTML = segments
      .map((segment) => {
        const width = ((segment.end - segment.start) / totalMinutes) * 100;
        return `<span class="timeline-segment ${segment.type}" style="width:${width}%"></span>`;
      })
      .join("");

    const businessStart = parseTimeToMinutes(state.roomConfig.businessStart);
    const businessEnd = parseTimeToMinutes(state.roomConfig.businessEnd);
    const nowMinutes = minutesSinceMidnight(now);
    if (nowMinutes >= businessStart && nowMinutes <= businessEnd) {
      pointer.classList.remove("hidden");
      pointer.style.left = `${((nowMinutes - businessStart) / (businessEnd - businessStart)) * 100}%`;
      setText("pointer-label", formatTimeOnly(now));
    } else {
      pointer.classList.add("hidden");
    }
  }

  function getTimelineSegments(bookings, date = new Date(), config = defaultRoomConfig) {
    const businessStart = parseTimeToMinutes(config.businessStart);
    const businessEnd = parseTimeToMinutes(config.businessEnd);
    const lunchStart = parseTimeToMinutes(config.lunchStart);
    const lunchEnd = parseTimeToMinutes(config.lunchEnd);
    const boundaries = new Set([businessStart, businessEnd, lunchStart, lunchEnd]);

    const dayBookings = getBookingsForDate(bookings, date);
    dayBookings.forEach((booking) => {
      const start = Math.max(businessStart, minutesSinceMidnight(new Date(booking.start)));
      const end = Math.min(businessEnd, minutesSinceMidnight(new Date(booking.end)));
      if (start < end) {
        boundaries.add(start);
        boundaries.add(end);
      }
    });

    const ordered = Array.from(boundaries)
      .filter((value) => value >= businessStart && value <= businessEnd)
      .sort((a, b) => a - b);

    const segments = [];
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const start = ordered[index];
      const end = ordered[index + 1];
      if (start >= end) {
        continue;
      }
      let type = "available";
      if (overlaps(start, end, lunchStart, lunchEnd)) {
        type = "lunch";
      } else if (
        dayBookings.some((booking) =>
          overlaps(
            start,
            end,
            minutesSinceMidnight(new Date(booking.start)),
            minutesSinceMidnight(new Date(booking.end))
          )
        )
      ) {
        type = "booked";
      }
      segments.push({ start, end, type });
    }
    return segments;
  }

  function getAvailabilitySegments(date, bookings = state.bookings, config = defaultRoomConfig) {
    return getTimelineSegments(bookings, date, config);
  }

  function getOverlappingBooking(date, startMinutes, endMinutes, bookings = state.bookings, editingId = null) {
    const dateBookings = getBookingsByDate(bookings, date);
    return dateBookings.find((booking) => {
      if (editingId && booking.id === editingId) {
        return false;
      }
      return overlaps(
        startMinutes,
        endMinutes,
        minutesSinceMidnight(new Date(booking.start)),
        minutesSinceMidnight(new Date(booking.end))
      );
    });
  }

  function formatPreviewRange(range) {
    const start = range.start;
    const end = range.end;
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleString("en-US", { month: "short", day: "numeric" });
    const endLabel = sameMonth
      ? `${end.getDate()}`
      : end.toLocaleString("en-US", { month: "short", day: "numeric" });
    return `${startLabel} - ${endLabel}`;
  }

  function formatPreviewDay(date) {
    const dateLines = formatDateLines(date);
    return {
      en: `${WEEKDAYS_EN[date.getDay()]} ${date.toLocaleString("en-US", { month: "short" })} ${date.getDate()}`,
      cn: dateLines.cn,
    };
  }

  function getTimelinePercent(minutes, config = defaultRoomConfig) {
    const businessStart = parseTimeToMinutes(config.businessStart);
    const businessEnd = parseTimeToMinutes(config.businessEnd);
    return ((minutes - businessStart) / (businessEnd - businessStart)) * 100;
  }

  function getMergedWeekBookingBlocks(bookings, config = defaultRoomConfig) {
    const businessStart = parseTimeToMinutes(config.businessStart);
    const businessEnd = parseTimeToMinutes(config.businessEnd);
    return sortBookings(bookings)
      .map((booking) => ({
        start: Math.max(businessStart, minutesSinceMidnight(new Date(booking.start))),
        end: Math.min(businessEnd, minutesSinceMidnight(new Date(booking.end))),
        bookings: [booking],
      }))
      .filter((block) => block.start < block.end)
      .reduce((blocks, block) => {
        const previous = blocks[blocks.length - 1];
        if (previous && block.start <= previous.end) {
          previous.end = Math.max(previous.end, block.end);
          previous.bookings.push(...block.bookings);
          return blocks;
        }
        blocks.push(block);
        return blocks;
      }, []);
  }

  function renderHolidayList() {
    const holidays = getFutureHolidays(state.holidays, new Date()).slice(0, 5);
    if (!holidays.length) {
      setHtml("holiday-list", `<p class="holiday-country">No upcoming holidays / 暂无节假日</p>`);
      return;
    }
    setHtml(
      "holiday-list",
      holidays
        .map(
          (holiday) => `
          <article class="holiday-item">
            <div>
              <p class="holiday-name">${escapeHtml(holiday.name)} / ${escapeHtml(holiday.nameCn)}</p>
              <p class="holiday-country">${escapeHtml(holiday.country)} / ${escapeHtml(holiday.countryCn)}</p>
            </div>
            <span class="holiday-date">${escapeHtml(formatHolidayDate(holiday))}</span>
          </article>
        `
        )
        .join("")
    );
  }

  function getFormData() {
    return {
      title: document.getElementById("meeting-title").value,
      booker: document.getElementById("meeting-booker").value,
      date: document.getElementById("meeting-date").value,
      startTime: document.getElementById("meeting-start").value,
      endTime: document.getElementById("meeting-end").value,
      remark: document.getElementById("meeting-remark").value,
    };
  }

  function setFormErrors(errors) {
    const box = document.getElementById("booking-errors");
    if (!box) {
      return;
    }
    box.classList.toggle("visible", Boolean(errors.length));
    box.innerHTML = errors.map((error) => `<div>${escapeHtml(error)}</div>`).join("");
  }

  function getBookingTimeFeedback(
    formData,
    existingBookings = state.bookings,
    config = state.roomConfig,
    editingId = null,
    now = new Date()
  ) {
    const messages = [];
    const date = String(formData.date || "").trim();
    const startTime = String(formData.startTime || "").trim();
    const endTime = String(formData.endTime || "").trim();
    if (!date || !startTime || !endTime) {
      return messages;
    }

    const start = createLocalDateTime(date, startTime);
    const end = createLocalDateTime(date, endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      messages.push({
        tone: "error",
        title: "Invalid time / 时间无效",
        detail: "Please select a valid meeting date and time. / 请选择有效的会议日期和时间。",
      });
      return messages;
    }

    if (end <= start) {
      messages.push({
        tone: "error",
        title: "End time is too early / 结束时间无效",
        detail: "End time must be later than start time. / 结束时间必须晚于开始时间。",
      });
    }
    if (isPastTime(start, now)) {
      messages.push({
        tone: "error",
        title: "Past time is not bookable / 过去时间不可预订",
        detail: "Please choose today after the current time, or a future date. / 请选择今天当前时间之后或未来日期。",
      });
    }
    if (!isWithinBusinessHours(start, end, config)) {
      messages.push({
        tone: "error",
        title: "Outside working hours / 超出工作时间",
        detail: `Meeting time must be within ${config.businessStart} - ${config.businessEnd}. / 会议时间需要在 ${config.businessStart} - ${config.businessEnd} 之间。`,
      });
    }
    if (overlapsLunch(start, end, config)) {
      messages.push({
        tone: "warning",
        title: "Lunch break is not bookable / 午休时间不可预订",
        detail: `Lunch break is ${config.lunchStart} - ${config.lunchEnd}. / 午休时间为 ${config.lunchStart} - ${config.lunchEnd}。`,
      });
    }

    const conflict = getOverlappingBooking(
      date,
      minutesSinceMidnight(start),
      minutesSinceMidnight(end),
      existingBookings,
      editingId
    );
    if (conflict) {
      messages.push({
        tone: "error",
        title: "Selected time conflicts with an existing meeting / 所选时间与现有会议冲突",
        detail: `This slot already has: ${formatTimeOnly(conflict.start)} - ${formatTimeOnly(conflict.end)} ${conflict.title} (${conflict.booker}).`,
      });
    }
    return messages;
  }

  function renderTimeFeedback(messages) {
    const feedback = document.getElementById("booking-time-feedback");
    if (!feedback) {
      return;
    }
    const first = messages[0];
    feedback.className = "booking-time-feedback";
    if (!first) {
      feedback.innerHTML = "";
      return;
    }
    feedback.classList.add("visible", first.tone === "warning" ? "warning" : "error");
    feedback.innerHTML = `
      <strong>${escapeHtml(first.title)}</strong>
      <span>${escapeHtml(first.detail)}</span>
    `;
  }

  function renderSelectedDateAvailability(dateValue) {
    const date = dateValue || document.getElementById("meeting-date")?.value;
    const timeline = document.getElementById("booking-availability-timeline");
    const selectedWindow = document.getElementById("booking-selected-window");
    const pointer = document.getElementById("booking-current-pointer");
    if (!date || !timeline || !selectedWindow || !pointer) {
      return;
    }

    const config = state.roomConfig;
    const totalMinutes = parseTimeToMinutes(config.businessEnd) - parseTimeToMinutes(config.businessStart);
    const segments = getAvailabilitySegments(date, state.bookings, config);
    timeline.innerHTML = segments
      .map((segment) => {
        const width = ((segment.end - segment.start) / totalMinutes) * 100;
        return `<span class="timeline-segment ${segment.type}" style="width:${width}%"></span>`;
      })
      .join("");

    const parsedDate = parseDateOnly(date);
    const label = `${parsedDate.getFullYear()}年${parsedDate.getMonth() + 1}月${parsedDate.getDate()}日`;
    setText("booking-availability-date", label);

    const formData = getFormData();
    const startMinutes = parseTimeToMinutes(formData.startTime);
    const endMinutes = parseTimeToMinutes(formData.endTime);
    if (endMinutes > startMinutes) {
      selectedWindow.classList.remove("hidden");
      selectedWindow.style.left = `${getTimelinePercent(startMinutes, config)}%`;
      selectedWindow.style.width = `${((endMinutes - startMinutes) / totalMinutes) * 100}%`;
    } else {
      selectedWindow.classList.add("hidden");
    }

    const now = new Date();
    const nowMinutes = minutesSinceMidnight(now);
    if (
      isSameDate(date, now) &&
      nowMinutes >= parseTimeToMinutes(config.businessStart) &&
      nowMinutes <= parseTimeToMinutes(config.businessEnd)
    ) {
      pointer.classList.remove("hidden");
      pointer.style.left = `${getTimelinePercent(nowMinutes, config)}%`;
      setText("booking-current-label", formatTimeOnly(now));
    } else {
      pointer.classList.add("hidden");
    }

    const editingId = document.getElementById("booking-id")?.value || null;
    renderTimeFeedback(getBookingTimeFeedback(formData, state.bookings, config, editingId));
  }

  function populateTimeOptions(selectedStart, selectedEnd) {
    const config = state.roomConfig;
    const slot = Number(config.timeSlotMinutes || 30);
    const businessStart = parseTimeToMinutes(config.businessStart);
    const businessEnd = parseTimeToMinutes(config.businessEnd);
    const lunchStart = parseTimeToMinutes(config.lunchStart);
    const lunchEnd = parseTimeToMinutes(config.lunchEnd);
    const dateInput = document.getElementById("meeting-date");
    const startSelect = document.getElementById("meeting-start");
    const endSelect = document.getElementById("meeting-end");
    const now = new Date();
    const selectedDate = dateInput?.value || formatInputDate(now);
    if (dateInput) {
      dateInput.min = formatInputDate(now);
    }

    const startOptions = [];
    for (let minute = businessStart; minute + slot <= businessEnd; minute += slot) {
      if (!(minute >= lunchStart && minute < lunchEnd)) {
        startOptions.push(minutesToTime(minute));
      }
    }

    const endOptions = [];
    for (let minute = businessStart + slot; minute <= businessEnd; minute += slot) {
      if (!(minute > lunchStart && minute <= lunchEnd)) {
        endOptions.push(minutesToTime(minute));
      }
    }

    startSelect.innerHTML = startOptions.map((time) => `<option value="${time}">${time}</option>`).join("");
    endSelect.innerHTML = endOptions.map((time) => `<option value="${time}">${time}</option>`).join("");

    Array.from(startSelect.options).forEach((option) => {
      option.disabled = isPastTime(createLocalDateTime(selectedDate, option.value), now);
    });

    const firstEnabledStart = Array.from(startSelect.options).find((option) => !option.disabled)?.value || "";
    if (
      selectedStart &&
      startOptions.includes(selectedStart) &&
      !Array.from(startSelect.options).find((option) => option.value === selectedStart)?.disabled
    ) {
      startSelect.value = selectedStart;
    } else if (firstEnabledStart) {
      startSelect.value = firstEnabledStart;
    }
    if (selectedEnd && endOptions.includes(selectedEnd)) {
      endSelect.value = selectedEnd;
    }
    syncEndOptions();
    renderSelectedDateAvailability(selectedDate);
  }

  function syncEndOptions() {
    const config = state.roomConfig;
    const dateInput = document.getElementById("meeting-date");
    const startSelect = document.getElementById("meeting-start");
    const endSelect = document.getElementById("meeting-end");
    const startMinutes = parseTimeToMinutes(startSelect.value);
    const slot = Number(config.timeSlotMinutes || 30);
    const lunchStart = parseTimeToMinutes(config.lunchStart);
    const lunchEnd = parseTimeToMinutes(config.lunchEnd);
    const selectedDate = dateInput?.value || formatInputDate(new Date());
    let firstEnabled = "";

    Array.from(endSelect.options).forEach((option) => {
      const optionMinutes = parseTimeToMinutes(option.value);
      const wouldOverlapLunch = startMinutes < lunchEnd && optionMinutes > lunchStart;
      const endWouldBePast = isPastTime(createLocalDateTime(selectedDate, option.value), new Date());
      const disabled = optionMinutes <= startMinutes || wouldOverlapLunch || endWouldBePast;
      option.disabled = disabled;
      if (!disabled && !firstEnabled) {
        firstEnabled = option.value;
      }
    });

    if (
      !endSelect.value ||
      endSelect.selectedOptions[0]?.disabled ||
      parseTimeToMinutes(endSelect.value) <= startMinutes
    ) {
      endSelect.value = firstEnabled || minutesToTime(startMinutes + slot);
    }
    renderSelectedDateAvailability(selectedDate);
  }

  function renderSchedulePreviewModal() {
    state.bookings = loadBookings();
    const range = getWeekRange(state.previewDate);
    setText("preview-week-range-text", `${formatPreviewRange(range)} / ${range.startDate} - ${range.endDate}`);

    const isWeek = state.previewView === "week";
    document.getElementById("week-view-panel")?.classList.toggle("active", isWeek);
    document.getElementById("agenda-view-panel")?.classList.toggle("active", !isWeek);
    document.getElementById("week-view-btn")?.classList.toggle("active", isWeek);
    document.getElementById("agenda-view-btn")?.classList.toggle("active", !isWeek);
    document.getElementById("week-view-btn")?.setAttribute("aria-selected", String(isWeek));
    document.getElementById("agenda-view-btn")?.setAttribute("aria-selected", String(!isWeek));

    renderWeekView(range);
    renderAgendaView(range);
  }

  function renderWeekView(range = getWeekRange(state.previewDate)) {
    const grid = document.getElementById("week-grid");
    if (!grid) {
      return;
    }

    const config = state.roomConfig;
    const businessStart = parseTimeToMinutes(config.businessStart);
    const businessEnd = parseTimeToMinutes(config.businessEnd);
    const totalMinutes = businessEnd - businessStart;
    const hours = [];
    for (let minute = businessStart; minute <= businessEnd; minute += 60) {
      hours.push(minute);
    }

    const timeColumn = `
      <aside class="week-time-column" aria-hidden="true">
        <div class="week-time-spacer"></div>
        <div class="week-time-labels">
          ${hours
            .map((minute) => {
              const timeLabelClass = minute === businessEnd ? "week-time-label end" : "week-time-label";
              return `<span class="${timeLabelClass}" style="top:${((minute - businessStart) / totalMinutes) * 100}%">${minutesToTime(minute)}</span>`;
            })
            .join("")}
        </div>
      </aside>
    `;

    const lunchTop = getTimelinePercent(parseTimeToMinutes(config.lunchStart), config);
    const lunchHeight =
      ((parseTimeToMinutes(config.lunchEnd) - parseTimeToMinutes(config.lunchStart)) / totalMinutes) * 100;

    const daysHtml = range.days
      .map((date, index) => {
        const dateKey = formatInputDate(date);
        const dayLabel = formatPreviewDay(date);
        const dayBookings = getBookingsByDate(state.bookings, dateKey);
        const bookingBlocks = getMergedWeekBookingBlocks(dayBookings, config)
          .map((block) => {
            const firstBooking = block.bookings[0];
            const label =
              block.bookings.length > 1
                ? `${minutesToTime(block.start)} - ${minutesToTime(block.end)} ${block.bookings.length} meetings occupied / 已占用`
                : `${formatTimeOnly(firstBooking.start)} - ${formatTimeOnly(firstBooking.end)} ${firstBooking.title} ${firstBooking.booker}`;
            return `
              <button
                class="week-booking"
                type="button"
                data-booking-id="${escapeHtml(firstBooking.id)}"
                data-booking-ids="${escapeHtml(block.bookings.map((booking) => booking.id).join(","))}"
                aria-label="${escapeHtml(label)}"
                style="top:${getTimelinePercent(block.start, config)}%;height:${((block.end - block.start) / totalMinutes) * 100}%"
              ></button>
            `;
          })
          .join("");

        return `
          <section class="week-day ${isSameDate(date, new Date()) ? "today" : ""}">
            <header class="week-day-header">
              <strong>${escapeHtml(dayLabel.en)}</strong>
              <span>${escapeHtml(dayLabel.cn)}</span>
            </header>
            <div class="week-day-lane" data-date="${dateKey}">
              <span class="week-lunch" style="top:${lunchTop}%;height:${lunchHeight}%">
                ${index === 2 ? '<span class="week-lunch-label">Lunch Break / 午休时间</span>' : ""}
              </span>
              ${bookingBlocks}
            </div>
          </section>
        `;
      })
      .join("");

    grid.innerHTML = `${timeColumn}${daysHtml}`;
    grid.querySelectorAll(".week-booking").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const ids = String(button.dataset.bookingIds || "")
          .split(",")
          .filter(Boolean);
        if (ids.length > 1) {
          openBookingGroupDetailModal(ids);
          return;
        }
        openBookingDetailModal(button.dataset.bookingId);
      });
    });
    grid.querySelectorAll(".week-day-lane").forEach((lane) => {
      lane.addEventListener("click", (event) => handleWeekLaneClick(event, lane));
    });
  }

  function handleWeekLaneClick(event, lane) {
    const config = state.roomConfig;
    const slot = Number(config.timeSlotMinutes || 30);
    const businessStart = parseTimeToMinutes(config.businessStart);
    const businessEnd = parseTimeToMinutes(config.businessEnd);
    const totalMinutes = businessEnd - businessStart;
    const rect = lane.getBoundingClientRect();
    const rawMinutes = businessStart + ((event.clientY - rect.top) / rect.height) * totalMinutes;
    const startMinutes = Math.floor(rawMinutes / slot) * slot;
    const endMinutes = Math.min(startMinutes + slot, businessEnd);
    const date = lane.dataset.date;
    if (!date || startMinutes < businessStart || endMinutes <= startMinutes) {
      return;
    }

    const segment = getAvailabilitySegments(date, state.bookings, config).find(
      (item) => startMinutes >= item.start && startMinutes < item.end
    );
    if (segment?.type === "lunch") {
      showToast("Lunch break is not bookable. / 午休时间不可预订。", "error");
      return;
    }
    if (segment?.type === "booked") {
      const conflict = getOverlappingBooking(date, startMinutes, endMinutes, state.bookings);
      if (conflict) {
        openBookingDetailModal(conflict.id);
      }
      return;
    }

    openBookingModalWithPreset(date, minutesToTime(startMinutes), minutesToTime(endMinutes));
  }

  function renderAgendaView(range = getWeekRange(state.previewDate)) {
    const list = document.getElementById("agenda-list");
    if (!list) {
      return;
    }

    const weekEnd = addDays(range.end, 1);
    const weekBookings = sortBookings(state.bookings).filter((booking) => {
      const start = new Date(booking.start);
      return start >= range.start && start < weekEnd;
    });
    if (!weekBookings.length) {
      list.innerHTML = `<div class="empty-preview">No meetings in this week / 本周暂无会议</div>`;
      return;
    }

    const groups = new Map();
    weekBookings.forEach((booking) => {
      const key = formatInputDate(new Date(booking.start));
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(booking);
    });

    list.innerHTML = Array.from(groups.entries())
      .map(([dateKey, bookings]) => {
        const date = parseDateOnly(dateKey);
        const day = formatPreviewDay(date);
        return `
          <section class="agenda-day">
            <h3>
              <svg class="ui-icon" aria-hidden="true" focusable="false">
                <use href="#icon-calendar-days"></use>
              </svg>
              <span>${escapeHtml(day.en)} / ${escapeHtml(day.cn)}</span>
            </h3>
            ${bookings
              .map((booking) => {
                const avatar = initials(booking.booker);
                return `
                  <button class="agenda-item" type="button" data-booking-id="${escapeHtml(booking.id)}">
                    <span class="agenda-time">
                      <svg class="ui-icon" aria-hidden="true" focusable="false">
                        <use href="#icon-clock-3"></use>
                      </svg>
                      <strong>${formatTimeOnly(booking.start)} - ${formatTimeOnly(booking.end)}</strong>
                    </span>
                    <span class="agenda-meeting">
                      <strong>${escapeHtml(booking.title)}</strong>
                      <span>${escapeHtml(booking.remark || "No remark / 无备注")}</span>
                    </span>
                    <span class="agenda-person">
                      <span class="avatar agenda-avatar" style="background:${avatarColor(booking.booker)}">${escapeHtml(avatar)}</span>
                      <span class="agenda-person-copy">
                        <strong>${escapeHtml(booking.booker)}</strong>
                        <small>Booker / 预订人</small>
                      </span>
                    </span>
                  </button>
                `;
              })
              .join("")}
          </section>
        `;
      })
      .join("");

    list.querySelectorAll(".agenda-item").forEach((item) => {
      item.addEventListener("click", () => openBookingDetailModal(item.dataset.bookingId));
    });
  }

  function openSchedulePreviewModal() {
    state.previewDate = new Date();
    state.previewView = "week";
    renderSchedulePreviewModal();
    showDialog(document.getElementById("schedule-preview-modal"));
  }

  function closeSchedulePreviewModal() {
    closeDialog(document.getElementById("schedule-preview-modal"));
  }

  function setPreviewView(view) {
    state.previewView = view;
    renderSchedulePreviewModal();
  }

  function movePreviewWeek(offset) {
    state.previewDate = addDays(state.previewDate, offset * 7);
    renderSchedulePreviewModal();
  }

  function openBookingModal(mode = "create", booking = null, preset = null) {
    const modal = document.getElementById("booking-modal");
    const title = document.getElementById("booking-modal-title");
    const defaults = booking
      ? {
          date: formatInputDate(new Date(booking.start)),
          startTime: formatTimeOnly(booking.start),
          endTime: formatTimeOnly(booking.end),
        }
      : preset || getDefaultTimeRange(new Date(), state.roomConfig);

    state.bookings = loadBookings();
    setFormErrors([]);
    title.textContent = mode === "edit" ? "Edit Booking / 编辑预订" : "Book Room / 预订会议室";
    document.getElementById("booking-id").value = booking ? booking.id : "";
    document.getElementById("meeting-title").value = booking ? booking.title : "";
    document.getElementById("meeting-booker").value = booking ? booking.booker : "";
    document.getElementById("meeting-date").value = defaults.date;
    document.getElementById("meeting-remark").value = booking ? booking.remark || "" : "";
    populateTimeOptions(defaults.startTime, defaults.endTime);

    showDialog(modal);
    document.getElementById("meeting-title").focus();
  }

  function openBookingModalWithPreset(date, startTime, endTime) {
    openBookingModal("create", null, { date, startTime, endTime });
  }

  function closeBookingModal() {
    closeDialog(document.getElementById("booking-modal"));
  }

  function openBookingDetailModal(bookingOrId) {
    const booking =
      typeof bookingOrId === "string"
        ? state.bookings.find((item) => item.id === bookingOrId)
        : bookingOrId;
    if (!booking) {
      showToast("Booking was not found. / 未找到该预订。", "error");
      return;
    }

    state.detailBookingId = booking.id;
    renderDetailActions(false);
    setText("detail-title", booking.title);
    setHtml(
      "detail-list",
      `
        <div>
          <dt>Time / 时间</dt>
          <dd>${escapeHtml(`${formatInputDate(new Date(booking.start))} ${formatTimeOnly(booking.start)} - ${formatTimeOnly(booking.end)}`)}</dd>
        </div>
        <div>
          <dt>Booker / 预订人</dt>
          <dd>${escapeHtml(booking.booker)}</dd>
        </div>
        <div>
          <dt>Status / 状态</dt>
          <dd>${escapeHtml(getBookingStatusLabel(booking, new Date()))}</dd>
        </div>
        <div>
          <dt>Remark / 备注</dt>
          <dd>${escapeHtml(booking.remark || "No remark / 无备注")}</dd>
        </div>
      `
    );
    showDialog(document.getElementById("detail-modal"));
  }

  function openBookingGroupDetailModal(ids) {
    const idSet = new Set(ids);
    const bookings = sortBookings(state.bookings.filter((booking) => idSet.has(booking.id)));
    if (!bookings.length) {
      showToast("Booking was not found. / 未找到该预订。", "error");
      return;
    }

    state.detailBookingId = null;
    renderDetailActions(true);
    const first = bookings[0];
    const last = bookings[bookings.length - 1];
    setText(
      "detail-title",
      `${formatTimeOnly(first.start)} - ${formatTimeOnly(last.end)} · ${bookings.length} Meetings / ${bookings.length} 场会议`
    );
    setHtml(
      "detail-list",
      `
        <div class="detail-group-summary">
          <dt>Occupied Time / 占用时间</dt>
          <dd>${escapeHtml(`${formatInputDate(new Date(first.start))} ${formatTimeOnly(first.start)} - ${formatTimeOnly(last.end)}`)}</dd>
        </div>
        <div class="detail-group">
          ${bookings
            .map(
              (booking) => `
                <article class="detail-meeting">
                  <div>
                    <strong>${escapeHtml(booking.title)}</strong>
                    <span>${escapeHtml(formatTimeOnly(booking.start))} - ${escapeHtml(formatTimeOnly(booking.end))}</span>
                  </div>
                  <div>
                    <span>${escapeHtml(booking.booker)}</span>
                    <small>${escapeHtml(booking.remark || "No remark / 无备注")}</small>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      `
    );
    showDialog(document.getElementById("detail-modal"));
  }

  function renderDetailActions(isGroup) {
    document.getElementById("edit-booking-btn")?.classList.toggle("hidden", isGroup);
    document.getElementById("delete-booking-btn")?.classList.toggle("hidden", isGroup);
  }

  function closeBookingDetailModal() {
    closeDialog(document.getElementById("detail-modal"));
    state.detailBookingId = null;
  }

  function handleSaveBooking(event) {
    event.preventDefault();
    const existingBookings = loadBookings();
    const editingId = document.getElementById("booking-id").value || null;
    const validation = validateBooking(getFormData(), existingBookings, state.roomConfig, editingId);

    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    const now = new Date().toISOString();
    const current = editingId ? existingBookings.find((booking) => booking.id === editingId) : null;
    const nextBooking = {
      id: editingId || generateBookingId(),
      title: validation.booking.title,
      booker: validation.booking.booker,
      start: validation.booking.start,
      end: validation.booking.end,
      remark: validation.booking.remark,
      createdAt: current ? current.createdAt : now,
      updatedAt: now,
    };

    const nextBookings = editingId
      ? existingBookings.map((booking) => (booking.id === editingId ? nextBooking : booking))
      : existingBookings.concat(nextBooking);

    saveBookings(nextBookings);
    closeBookingModal();
    renderApp();
    if (document.getElementById("schedule-preview-modal")?.open) {
      renderSchedulePreviewModal();
    }
    showToast(editingId ? "Booking updated. / 预订已更新。" : "Booking saved. / 预订已保存。", "success");
  }

  function handleDeleteBooking() {
    const booking = state.bookings.find((item) => item.id === state.detailBookingId);
    if (!booking) {
      return;
    }

    const confirmed = root.confirm(
      "Are you sure you want to delete this booking?\n确认删除该会议预定吗？"
    );
    if (!confirmed) {
      return;
    }

    saveBookings(state.bookings.filter((item) => item.id !== booking.id));
    closeBookingDetailModal();
    renderApp();
    if (document.getElementById("schedule-preview-modal")?.open) {
      renderSchedulePreviewModal();
    }
    showToast("Booking deleted. / 预订已删除。", "success");
  }

  function exportMeetingRecords() {
    const workbook = createMeetingRecordsWorkbook(loadBookings(), new Date());
    const blob = new Blob([workbook.bytes], { type: workbook.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = workbook.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Meeting records exported. / 会议记录已导出。", "success");
  }

  async function importMeetingRecordsFile(event) {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    try {
      const bytes = await readFileAsArrayBuffer(file);
      const imported = parseMeetingRecordsWorkbook(bytes, new Date());
      if (!imported.bookings.length) {
        showToast("No valid meeting records found. / 未找到有效会议记录。", "error");
        return;
      }

      const existingCount = loadBookings().length;
      const message = existingCount
        ? `Import ${imported.bookings.length} meeting records and replace ${existingCount} current records?\n导入 ${imported.bookings.length} 条会议记录，并替换当前 ${existingCount} 条记录吗？`
        : `Import ${imported.bookings.length} meeting records?\n确认导入 ${imported.bookings.length} 条会议记录吗？`;
      if (!root.confirm(message)) {
        return;
      }

      saveBookings(imported.bookings);
      state.bookings = loadBookings();
      closeDialog(document.getElementById("data-modal"));
      renderApp();
      if (document.getElementById("schedule-preview-modal")?.open) {
        renderSchedulePreviewModal();
      }
      const skippedText = imported.skippedRows
        ? ` Skipped ${imported.skippedRows} invalid rows. / 已跳过 ${imported.skippedRows} 条无效记录。`
        : "";
      showToast(`Meeting records imported. / 会议记录已导入。${skippedText}`, "success");
    } catch (error) {
      showToast(error.message || "Import failed. / 导入失败。", "error");
    } finally {
      if (input) {
        input.value = "";
      }
    }
  }

  function readFileAsArrayBuffer(file) {
    if (typeof file.arrayBuffer === "function") {
      return file.arrayBuffer();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", () => reject(reader.error || new Error("Failed to read file.")));
      reader.readAsArrayBuffer(file);
    });
  }

  function createMeetingRecordsWorkbook(bookings = [], exportedAt = new Date()) {
    const rows = [meetingRecordExportHeaders].concat(
      sortBookings(bookings.filter(isBookingLike)).map(getMeetingRecordExportRow)
    );
    const worksheetXml = createWorksheetXml(rows);
    const files = [
      {
        path: "[Content_Types].xml",
        content:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          "</Types>",
      },
      {
        path: "_rels/.rels",
        content:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          "</Relationships>",
      },
      {
        path: "xl/workbook.xml",
        content:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          '<sheets><sheet name="Meeting Records" sheetId="1" r:id="rId1"/></sheets>' +
          "</workbook>",
      },
      {
        path: "xl/_rels/workbook.xml.rels",
        content:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          "</Relationships>",
      },
      {
        path: "xl/worksheets/sheet1.xml",
        content: worksheetXml,
      },
    ];
    return {
      fileName: `aihero-meeting-records-${formatInputDate(exportedAt)}.xlsx`,
      mimeType: XLSX_MIME_TYPE,
      bytes: createZipArchive(files, exportedAt),
    };
  }

  function parseMeetingRecordsWorkbook(bytes, importedAt = new Date()) {
    const files = readZipStoredFiles(bytes);
    const worksheetXml = files["xl/worksheets/sheet1.xml"];
    if (!worksheetXml) {
      throw new Error("Invalid meeting records Excel file. / 无法识别会议记录 Excel 文件。");
    }

    const rows = parseWorksheetRows(worksheetXml);
    if (rows.length < 2) {
      return { bookings: [], skippedRows: 0, totalRows: 0 };
    }

    const header = rows[0].map((value) => normalizeCellText(value));
    const indexes = {
      date: header.indexOf("Date / 日期"),
      startTime: header.indexOf("Start Time / 开始时间"),
      endTime: header.indexOf("End Time / 结束时间"),
      title: header.indexOf("Meeting Name / 会议名称"),
      booker: header.indexOf("Booker / 预订人"),
      remark: header.indexOf("Remark / 备注"),
    };
    const requiredIndexes = [indexes.date, indexes.startTime, indexes.endTime, indexes.title, indexes.booker];
    if (requiredIndexes.some((index) => index < 0)) {
      throw new Error("Invalid meeting records headers. / 会议记录表头不正确。");
    }

    const timestamp = toLocalIso(importedAt instanceof Date ? importedAt : new Date());
    let skippedRows = 0;
    const bookings = rows.slice(1).reduce((items, row, rowOffset) => {
      const record = {
        date: normalizeCellText(row[indexes.date]),
        startTime: normalizeCellText(row[indexes.startTime]),
        endTime: normalizeCellText(row[indexes.endTime]),
        title: normalizeCellText(row[indexes.title]),
        booker: normalizeCellText(row[indexes.booker]),
        remark: indexes.remark >= 0 ? normalizeCellText(row[indexes.remark]) : "",
      };

      const start = createLocalDateTime(record.date, record.startTime);
      const end = createLocalDateTime(record.date, record.endTime);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
        Number.isNaN(parseTimeToMinutes(record.startTime)) ||
        Number.isNaN(parseTimeToMinutes(record.endTime)) ||
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end <= start ||
        !record.title ||
        !record.booker
      ) {
        skippedRows += 1;
        return items;
      }

      const idSource = `${record.date}|${record.startTime}|${record.endTime}|${record.title}|${record.booker}|${rowOffset}`;
      items.push({
        id: `imported_booking_${rowOffset + 1}_${hashText(idSource).toString(36)}`,
        title: record.title,
        booker: record.booker,
        start: toLocalIso(start),
        end: toLocalIso(end),
        remark: record.remark,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return items;
    }, []);

    return {
      bookings: sortBookings(bookings),
      skippedRows,
      totalRows: rows.length - 1,
    };
  }

  function getMeetingRecordExportRow(booking) {
    return [
      formatInputDate(new Date(booking.start)),
      formatTimeOnly(booking.start),
      formatTimeOnly(booking.end),
      formatDurationLabel(booking.start, booking.end),
      booking.title,
      booking.booker,
      booking.remark || "",
    ];
  }

  function formatDurationLabel(startValue, endValue) {
    const start = new Date(startValue);
    const end = new Date(endValue);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return "";
    }
    if (minutes % 60 === 0) {
      return `${minutes / 60}h`;
    }
    return `${minutes}min`;
  }

  function createWorksheetXml(rows) {
    const lastColumn = columnNumberToName(Math.max(meetingRecordExportHeaders.length, 1));
    const lastRow = Math.max(rows.length, 1);
    const sheetData = rows
      .map((row, rowIndex) => {
        const rowNumber = rowIndex + 1;
        const cells = row
          .map((value, columnIndex) => createWorksheetCell(value, rowNumber, columnIndex + 1))
          .join("");
        return `<row r="${rowNumber}">${cells}</row>`;
      })
      .join("");
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<dimension ref="A1:${lastColumn}${lastRow}"/>` +
      '<sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="18"/>' +
      "<cols>" +
      '<col min="1" max="1" width="14" customWidth="1"/>' +
      '<col min="2" max="3" width="13" customWidth="1"/>' +
      '<col min="4" max="4" width="13" customWidth="1"/>' +
      '<col min="5" max="5" width="28" customWidth="1"/>' +
      '<col min="6" max="6" width="18" customWidth="1"/>' +
      '<col min="7" max="7" width="34" customWidth="1"/>' +
      "</cols>" +
      `<sheetData>${sheetData}</sheetData>` +
      "</worksheet>"
    );
  }

  function createWorksheetCell(value, rowNumber, columnNumber) {
    const cellRef = `${columnNumberToName(columnNumber)}${rowNumber}`;
    return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
  }

  function readZipStoredFiles(input) {
    const bytes = normalizeBytes(input);
    if (bytes.length < 4 || readUint32(bytes, 0) !== 0x04034b50) {
      throw new Error("Invalid Excel file. / Excel 文件无效。");
    }

    const files = {};
    let offset = 0;
    while (offset + 30 <= bytes.length && readUint32(bytes, offset) === 0x04034b50) {
      const flags = readUint16(bytes, offset + 6);
      const method = readUint16(bytes, offset + 8);
      const compressedSize = readUint32(bytes, offset + 18);
      const uncompressedSize = readUint32(bytes, offset + 22);
      const fileNameLength = readUint16(bytes, offset + 26);
      const extraLength = readUint16(bytes, offset + 28);
      const nameStart = offset + 30;
      const dataStart = nameStart + fileNameLength + extraLength;
      const dataEnd = dataStart + compressedSize;

      if (dataEnd > bytes.length) {
        throw new Error("Invalid Excel file structure. / Excel 文件结构无效。");
      }
      if ((flags & 0x08) !== 0) {
        throw new Error("Unsupported Excel package format. / 不支持该 Excel 包格式。");
      }
      if (method !== 0) {
        throw new Error("Only meeting records exported by this app can be imported. / 仅支持导入本系统导出的会议记录。");
      }
      if (compressedSize !== uncompressedSize) {
        throw new Error("Invalid Excel file size metadata. / Excel 文件大小信息无效。");
      }

      const name = decodeUtf8(bytes.slice(nameStart, nameStart + fileNameLength));
      files[name] = decodeUtf8(bytes.slice(dataStart, dataEnd));
      offset = dataEnd;
    }

    if (!Object.keys(files).length) {
      throw new Error("Invalid Excel file. / Excel 文件无效。");
    }
    return files;
  }

  function parseWorksheetRows(worksheetXml) {
    const rows = [];
    const rowPattern = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    let rowMatch;
    while ((rowMatch = rowPattern.exec(worksheetXml))) {
      const row = [];
      const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
      let cellMatch;
      while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
        const refMatch = /\br="([A-Z]+)\d+"/.exec(cellMatch[1]);
        const columnIndex = refMatch ? columnNameToNumber(refMatch[1]) - 1 : row.length;
        row[columnIndex] = extractCellText(cellMatch[2]);
      }
      rows.push(row.map((value) => value ?? ""));
    }
    return rows;
  }

  function extractCellText(cellXml) {
    const values = [];
    const textPattern = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
    let textMatch;
    while ((textMatch = textPattern.exec(cellXml))) {
      values.push(decodeXml(textMatch[1]));
    }
    return values.join("");
  }

  function normalizeCellText(value) {
    return String(value ?? "").replace(/\r\n/g, "\n").trim();
  }

  function columnNameToNumber(name) {
    return String(name || "")
      .split("")
      .reduce((number, char) => number * 26 + char.charCodeAt(0) - 64, 0);
  }

  function readUint16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  function readUint32(bytes, offset) {
    return (
      (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)) >>>
      0
    );
  }

  function normalizeBytes(input) {
    if (input instanceof Uint8Array) {
      return input;
    }
    if (input instanceof ArrayBuffer) {
      return new Uint8Array(input);
    }
    if (ArrayBuffer.isView(input)) {
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    throw new Error("Invalid file bytes. / 文件内容无效。");
  }

  function columnNumberToName(columnNumber) {
    let value = columnNumber;
    let name = "";
    while (value > 0) {
      value -= 1;
      name = String.fromCharCode(65 + (value % 26)) + name;
      value = Math.floor(value / 26);
    }
    return name;
  }

  function escapeXml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function decodeXml(value) {
    return String(value ?? "").replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity) => {
      const lower = entity.toLowerCase();
      if (lower === "amp") {
        return "&";
      }
      if (lower === "lt") {
        return "<";
      }
      if (lower === "gt") {
        return ">";
      }
      if (lower === "quot") {
        return '"';
      }
      if (lower === "apos") {
        return "'";
      }
      if (lower.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
      }
      if (lower.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
      }
      return match;
    });
  }

  function createZipArchive(files, modifiedAt = new Date()) {
    const zipDateTime = getZipDateTime(modifiedAt);
    let offset = 0;
    const localParts = [];
    const centralParts = [];

    for (const file of files) {
      const nameBytes = encodeUtf8(file.path);
      const dataBytes = encodeUtf8(file.content);
      const crc = crc32(dataBytes);
      const localHeader = createZipLocalHeader(nameBytes, dataBytes.length, crc, zipDateTime);
      const centralHeader = createZipCentralHeader(
        nameBytes,
        dataBytes.length,
        crc,
        offset,
        zipDateTime
      );
      localParts.push(localHeader, dataBytes);
      centralParts.push(centralHeader);
      offset += localHeader.length + dataBytes.length;
    }

    const centralOffset = offset;
    const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
    const endRecord = createZipEndRecord(files.length, centralSize, centralOffset);
    return concatBytes(localParts.concat(centralParts, endRecord));
  }

  function createZipLocalHeader(nameBytes, dataLength, crc, zipDateTime) {
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, zipDateTime.time, true);
    view.setUint16(12, zipDateTime.date, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, dataLength, true);
    view.setUint32(22, dataLength, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    header.set(nameBytes, 30);
    return header;
  }

  function createZipCentralHeader(nameBytes, dataLength, crc, localOffset, zipDateTime) {
    const header = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, zipDateTime.time, true);
    view.setUint16(14, zipDateTime.date, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, dataLength, true);
    view.setUint32(24, dataLength, true);
    view.setUint16(28, nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, localOffset, true);
    header.set(nameBytes, 46);
    return header;
  }

  function createZipEndRecord(fileCount, centralSize, centralOffset) {
    const header = new Uint8Array(22);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, fileCount, true);
    view.setUint16(10, fileCount, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, centralOffset, true);
    view.setUint16(20, 0, true);
    return header;
  }

  function getZipDateTime(date) {
    const value = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    const year = Math.max(1980, value.getFullYear());
    return {
      time: (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate(),
    };
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
      crc = (crc >>> 8) ^ getCrcTable()[(crc ^ bytes[index]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function getCrcTable() {
    if (state.crcTable) {
      return state.crcTable;
    }
    state.crcTable = Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      return value >>> 0;
    });
    return state.crcTable;
  }

  function encodeUtf8(value) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(String(value));
    }
    const encoded = unescape(encodeURIComponent(String(value)));
    const bytes = new Uint8Array(encoded.length);
    for (let index = 0; index < encoded.length; index += 1) {
      bytes[index] = encoded.charCodeAt(index);
    }
    return bytes;
  }

  function decodeUtf8(bytes) {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8").decode(bytes);
    }
    if (typeof Buffer !== "undefined") {
      return Buffer.from(bytes).toString("utf8");
    }
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return decodeURIComponent(escape(binary));
  }

  function hashText(value) {
    return crc32(encodeUtf8(value));
  }

  function concatBytes(parts) {
    const totalLength = parts.reduce((total, part) => total + part.length, 0);
    const bytes = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
    }
    return bytes;
  }

  function resetData() {
    const confirmed = root.confirm(
      "Reset all booking data on this device?\n确认重置本设备上的会议预订数据吗？"
    );
    if (!confirmed) {
      return;
    }

    const keepConfig = root.confirm(
      "Keep room configuration?\n是否保留会议室配置？\n\nOK = keep, Cancel = reset config"
    );
    const storage = getStorage();
    if (!storage) {
      return;
    }
    storage.removeItem(STORAGE_KEYS.bookings);
    storage.removeItem(STORAGE_KEYS.holidayCache);
    storage.removeItem(STORAGE_KEYS.holidayLastUpdated);
    if (!keepConfig) {
      storage.removeItem(STORAGE_KEYS.roomConfig);
    }

    closeDialog(document.getElementById("data-modal"));
    renderApp();
    showToast("Data reset. / 数据已重置。", "success");
  }

  function configureDesktopControls() {
    const exitButton = document.getElementById("exit-app-btn");
    if (!root.AIHeroDesktop?.isDesktop) {
      return;
    }
    document.addEventListener("pointerup", restoreDesktopInputFocus);
    document.addEventListener("touchend", restoreDesktopInputFocus);

    if (exitButton) {
      exitButton.classList.remove("hidden");
      exitButton.addEventListener("click", () => {
        const confirmed = root.confirm(
          "Exit the meeting room display app?\n确认退出会议大屏应用吗？"
        );
        if (confirmed && typeof root.AIHeroDesktop.requestExit === "function") {
          root.AIHeroDesktop.requestExit();
        }
      });
    }
  }

  function restoreDesktopInputFocus(event) {
    const target = event.target?.closest?.("input, textarea");
    if (!target || target.type === "hidden" || target.disabled || target.readOnly) {
      return;
    }
    window.requestAnimationFrame(() => {
      if (!document.contains(target) || target.disabled || target.readOnly) {
        return;
      }
      if (document.activeElement !== target) {
        target.focus({ preventScroll: true });
      }
    });
  }

  function showToast(message, tone = "info") {
    const toast = document.getElementById("toast");
    if (!toast) {
      return;
    }
    clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.className = `toast visible ${tone === "error" ? "error" : tone === "success" ? "success" : ""}`;
    state.toastTimer = setTimeout(() => {
      toast.classList.remove("visible");
    }, 2600);
  }

  function bindEvents() {
    ["booking-modal", "detail-modal", "data-modal", "schedule-preview-modal"].forEach((id) => {
      const dialog = document.getElementById(id);
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeDialog(dialog);
      });
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
          closeDialog(dialog);
        }
      });
    });
    document.getElementById("book-room-btn").addEventListener("click", () => openBookingModal());
    document.getElementById("schedule-preview-btn").addEventListener("click", openSchedulePreviewModal);
    document.getElementById("data-menu-btn").addEventListener("click", () => {
      showDialog(document.getElementById("data-modal"));
    });
    document.querySelectorAll("[data-close-booking]").forEach((button) => {
      button.addEventListener("click", closeBookingModal);
    });
    document.querySelectorAll("[data-close-detail]").forEach((button) => {
      button.addEventListener("click", closeBookingDetailModal);
    });
    document.querySelectorAll("[data-close-data]").forEach((button) => {
      button.addEventListener("click", () => closeDialog(document.getElementById("data-modal")));
    });
    document.querySelectorAll("[data-close-schedule]").forEach((button) => {
      button.addEventListener("click", closeSchedulePreviewModal);
    });
    document.getElementById("booking-form").addEventListener("submit", handleSaveBooking);
    document.getElementById("meeting-start").addEventListener("change", syncEndOptions);
    document.getElementById("meeting-end").addEventListener("change", () => {
      renderSelectedDateAvailability(document.getElementById("meeting-date").value);
    });
    document.getElementById("meeting-date").addEventListener("change", () => {
      populateTimeOptions(
        document.getElementById("meeting-start").value,
        document.getElementById("meeting-end").value
      );
    });
    document.getElementById("preview-prev-week").addEventListener("click", () => movePreviewWeek(-1));
    document.getElementById("preview-this-week").addEventListener("click", () => {
      state.previewDate = new Date();
      renderSchedulePreviewModal();
    });
    document.getElementById("preview-next-week").addEventListener("click", () => movePreviewWeek(1));
    document.getElementById("week-view-btn").addEventListener("click", () => setPreviewView("week"));
    document.getElementById("agenda-view-btn").addEventListener("click", () => setPreviewView("agenda"));
    document.getElementById("edit-booking-btn").addEventListener("click", () => {
      const booking = state.bookings.find((item) => item.id === state.detailBookingId);
      if (booking) {
        closeDialog(document.getElementById("detail-modal"), () => openBookingModal("edit", booking));
        state.detailBookingId = null;
      }
    });
    document.getElementById("delete-booking-btn").addEventListener("click", handleDeleteBooking);
    document.getElementById("import-data-btn").addEventListener("click", () => {
      document.getElementById("import-data-input").click();
    });
    document.getElementById("import-data-input").addEventListener("change", importMeetingRecordsFile);
    document.getElementById("export-data-btn").addEventListener("click", exportMeetingRecords);
    document.getElementById("reset-data-btn").addEventListener("click", resetData);
    configureDesktopControls();
  }

  async function initApp() {
    state.roomConfig = loadRoomConfig();
    state.bookings = loadBookings();
    state.holidays = loadHolidayCache() || defaultHolidayData.slice();
    bindEvents();
    renderApp();

    try {
      state.holidays = await refreshHolidaysIfNeeded();
      renderHolidayList();
    } catch (error) {
      state.holidays = loadHolidayCache() || defaultHolidayData.slice();
      renderHolidayList();
    }

    setInterval(renderApp, 30000);
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", initApp);
  }

  return {
    STORAGE_KEYS,
    defaultRoomConfig,
    defaultHolidayData,
    loadBookings,
    saveBookings,
    loadRoomConfig,
    saveRoomConfig,
    loadHolidayCache,
    saveHolidayCache,
    createMeetingRecordsWorkbook,
    parseMeetingRecordsWorkbook,
    shouldRefreshHolidays,
    refreshHolidaysIfNeeded,
    fetchHolidayProviders,
    getHolidayProviderRequests,
    normalizeHolidayPayload,
    mergeConsecutiveHolidays,
    getBookingsByDate,
    getBookingsByDateRange,
    getWeekRange,
    isSameDate,
    isPastTime,
    getTodayBookings,
    getCurrentBooking,
    getNextBooking,
    getBookingStatus,
    validateBooking,
    hasTimeConflict,
    getBookingTimeFeedback,
    overlapsLunch,
    isWithinBusinessHours,
    sortBookings,
    getTimelineSegments,
    getAvailabilitySegments,
    getMergedWeekBookingBlocks,
    renderSchedulePreviewModal,
    renderWeekView,
    renderAgendaView,
    renderSelectedDateAvailability,
    openBookingModalWithPreset,
    openSchedulePreviewModal,
    setPreviewView,
    parseTimeToMinutes,
    minutesToTime,
    formatInputDate,
    getDefaultTimeRange,
  };
});
