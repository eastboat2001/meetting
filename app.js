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
    if (!shouldRefreshHolidays(new Date(), config)) {
      return cached && cached.length ? cached : defaultHolidayData.slice();
    }

    const fetched = await fetchHolidayProviders(config.holidayProviders || []);
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

  async function fetchHolidayProviders(providers) {
    if (!Array.isArray(providers) || !providers.length || typeof fetch !== "function") {
      return [];
    }

    const results = await Promise.allSettled(
      providers
        .filter((provider) => typeof provider === "string" && provider.trim())
        .map((url) => fetch(url, { cache: "no-store" }).then((response) => response.json()))
    );

    return results
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => normalizeHolidayPayload(result.value))
      .filter(isHolidayLike);
  }

  function normalizeHolidayPayload(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.holidays)) {
      return payload.holidays;
    }
    if (payload && Array.isArray(payload.data)) {
      return payload.data;
    }
    return [];
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

  function validateBooking(formData, existingBookings = [], config = defaultRoomConfig, editingId = null) {
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

  function populateTimeOptions(selectedStart, selectedEnd) {
    const config = state.roomConfig;
    const slot = Number(config.timeSlotMinutes || 30);
    const businessStart = parseTimeToMinutes(config.businessStart);
    const businessEnd = parseTimeToMinutes(config.businessEnd);
    const lunchStart = parseTimeToMinutes(config.lunchStart);
    const lunchEnd = parseTimeToMinutes(config.lunchEnd);
    const startSelect = document.getElementById("meeting-start");
    const endSelect = document.getElementById("meeting-end");

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

    if (selectedStart && startOptions.includes(selectedStart)) {
      startSelect.value = selectedStart;
    }
    if (selectedEnd && endOptions.includes(selectedEnd)) {
      endSelect.value = selectedEnd;
    }
    syncEndOptions();
  }

  function syncEndOptions() {
    const config = state.roomConfig;
    const startSelect = document.getElementById("meeting-start");
    const endSelect = document.getElementById("meeting-end");
    const startMinutes = parseTimeToMinutes(startSelect.value);
    const slot = Number(config.timeSlotMinutes || 30);
    const lunchStart = parseTimeToMinutes(config.lunchStart);
    const lunchEnd = parseTimeToMinutes(config.lunchEnd);
    let firstEnabled = "";

    Array.from(endSelect.options).forEach((option) => {
      const optionMinutes = parseTimeToMinutes(option.value);
      const wouldOverlapLunch = startMinutes < lunchEnd && optionMinutes > lunchStart;
      const disabled = optionMinutes <= startMinutes || wouldOverlapLunch;
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
  }

  function openBookingModal(mode = "create", booking = null) {
    const modal = document.getElementById("booking-modal");
    const title = document.getElementById("booking-modal-title");
    const defaults = booking
      ? {
          date: formatInputDate(new Date(booking.start)),
          startTime: formatTimeOnly(booking.start),
          endTime: formatTimeOnly(booking.end),
        }
      : getDefaultTimeRange(new Date(), state.roomConfig);

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
    setText("detail-title", booking.title);
    setText(
      "detail-time",
      `${formatInputDate(new Date(booking.start))} ${formatTimeOnly(booking.start)} - ${formatTimeOnly(booking.end)}`
    );
    setText("detail-booker", booking.booker);
    setText("detail-status", getBookingStatusLabel(booking, new Date()));
    setText("detail-remark", booking.remark || "No remark / 无备注");
    showDialog(document.getElementById("detail-modal"));
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
    showToast("Booking deleted. / 预订已删除。", "success");
  }

  function exportData() {
    const payload = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      bookings: loadBookings(),
      roomConfig: loadRoomConfig(),
      holidayCache: loadHolidayCache() || defaultHolidayData,
      holidayLastUpdated: loadHolidayLastUpdated(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aihero-booking-data-${formatInputDate(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Data exported. / 数据已导出。", "success");
  }

  async function importData(file) {
    if (!file) {
      return;
    }

    try {
      const payload = JSON.parse(await file.text());
      if (!payload || !Array.isArray(payload.bookings) || typeof payload.roomConfig !== "object") {
        throw new Error("Missing required fields");
      }

      saveBookings(payload.bookings.filter(isBookingLike));
      saveRoomConfig({ ...defaultRoomConfig, ...payload.roomConfig });
      if (Array.isArray(payload.holidayCache)) {
        saveHolidayCache(payload.holidayCache);
      }
      if (payload.holidayLastUpdated) {
        const storage = getStorage();
        if (storage) {
          storage.setItem(STORAGE_KEYS.holidayLastUpdated, payload.holidayLastUpdated);
        }
      }

      closeDialog(document.getElementById("data-modal"));
      renderApp();
      showToast("Data imported. / 数据已导入。", "success");
    } catch (error) {
      showToast("Import failed. Please check the JSON file. / 导入失败，请检查 JSON 文件。", "error");
    }
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
    ["booking-modal", "detail-modal", "data-modal"].forEach((id) => {
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
    document.getElementById("booking-form").addEventListener("submit", handleSaveBooking);
    document.getElementById("meeting-start").addEventListener("change", syncEndOptions);
    document.getElementById("meeting-date").addEventListener("change", () => {
      populateTimeOptions(
        document.getElementById("meeting-start").value,
        document.getElementById("meeting-end").value
      );
    });
    document.getElementById("edit-booking-btn").addEventListener("click", () => {
      const booking = state.bookings.find((item) => item.id === state.detailBookingId);
      if (booking) {
        closeDialog(document.getElementById("detail-modal"), () => openBookingModal("edit", booking));
        state.detailBookingId = null;
      }
    });
    document.getElementById("delete-booking-btn").addEventListener("click", handleDeleteBooking);
    document.getElementById("export-data-btn").addEventListener("click", exportData);
    document.getElementById("import-data-input").addEventListener("change", (event) => {
      importData(event.target.files[0]);
      event.target.value = "";
    });
    document.getElementById("reset-data-btn").addEventListener("click", resetData);
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
    shouldRefreshHolidays,
    refreshHolidaysIfNeeded,
    getTodayBookings,
    getCurrentBooking,
    getNextBooking,
    getBookingStatus,
    validateBooking,
    hasTimeConflict,
    overlapsLunch,
    isWithinBusinessHours,
    sortBookings,
    getTimelineSegments,
    parseTimeToMinutes,
    minutesToTime,
    formatInputDate,
    getDefaultTimeRange,
  };
});
