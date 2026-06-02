const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const app = fs.readFileSync("app.js", "utf8");

const brandBlock = html.match(/<section class="brand-block">([\s\S]*?)<\/section>/)?.[1] || "";
const clockBlock = html.match(/<section class="clock-block"[\s\S]*?>([\s\S]*?)<\/section>/)?.[1] || "";
const holidayCard = html.match(/<section class="holiday-card"[\s\S]*?>([\s\S]*?)<\/section>/)?.[1] || "";
const topActions = html.match(/<header class="top-actions">([\s\S]*?)<\/header>/)?.[1] || "";
const legendBlock = css.match(/\.timeline-card \.legend\s*{([^}]*)}/)?.[1] || "";
const currentTimeBlock = css.match(/\.current-time\s*{([^}]*)}/)?.[1] || "";
const dateLineBlock = css.match(/\.date-line\s*{([^}]*)}/)?.[1] || "";
const requiredIconFiles = ["clock-3", "info", "calendar-days", "users", "monitor", "video", "wifi"];
const summaryTitles = ["next-meeting-title", "room-details-title", "availability-title"].map((id) => {
  const match = html.match(new RegExp(`<h2 id="${id}">([^<]+)<\\/h2>`));
  return match?.[1] || "";
});

assert.ok(!html.includes("modify-booking-btn"), "modify booking button should be removed");
assert.ok(brandBlock.includes('id="data-menu-btn"'), "settings button should live in the brand block");
assert.ok(!topActions.includes('id="data-menu-btn"'), "settings button should not be in right top actions");
assert.ok(
  brandBlock.indexOf('id="data-menu-btn"') < brandBlock.indexOf('id="app-name"'),
  "settings button should appear before the AI英雄汇 title"
);
assert.ok(topActions.includes('id="book-room-btn"'), "book room button should remain in top actions");
assert.ok(!clockBlock.includes("CURRENT TIME / 当前时间"), "left clock block should not show a redundant current-time label");
assert.match(currentTimeBlock, /font-size:\s*clamp\(3\.15rem,\s*4\.35vw,\s*4\.25rem\);/, "left clock time should use a smaller display size");
assert.match(dateLineBlock, /font-size:\s*clamp\(0\.78rem,\s*1\.02vw,\s*0\.95rem\);/, "left clock date text should be smaller than before");
assert.deepStrictEqual(summaryTitles, ["NEXT MEETING", "ROOM DETAILS", "AVAILABILITY"], "summary card English titles should not include slash separators when Chinese titles sit on the next line");
for (const icon of requiredIconFiles) {
  assert.ok(fs.existsSync(`assets/icons/${icon}.svg`), `downloaded Lucide icon should exist offline: ${icon}`);
  assert.ok(html.includes(`id="icon-${icon}"`), `inline icon sprite should include ${icon}`);
}
assert.ok(!html.includes(">◴<") && !html.includes(">ⓘ<"), "summary card icons should use SVG instead of font glyphs");
assert.ok(!html.includes('class="card-icon blue">▣'), "availability card icon should use SVG instead of a font glyph");
assert.ok(!holidayCard.includes("▣"), "holiday card title icon should use SVG instead of a square font glyph");
assert.ok(holidayCard.includes('<svg class="ui-icon"') && holidayCard.includes('href="#icon-calendar-days"'), "holiday card title icon should use a semantic calendar SVG icon");
assert.ok(!app.includes('"♙"') && !app.includes('"▣"') && !app.includes('"▤"') && !app.includes('"⌁"'), "room detail feature icons should use SVG instead of font glyphs");
assert.ok(app.includes("feature-icon") && app.includes('href="#icon-${iconId}"'), "room detail feature icons should render Lucide SVG symbols");
assert.ok(app.includes('"users"') && app.includes('"monitor"') && app.includes('"video"') && app.includes('"wifi"'), "room detail feature icons should map to semantic Lucide icons");
assert.match(css, /\.card-icon \.ui-icon\s*{[\s\S]*width:\s*clamp\(1rem,\s*1\.25vw,\s*1\.12rem\);/, "summary card icon SVGs should have a controlled size");
assert.ok(!css.includes("@media (max-width"), "mobile breakpoint layouts should be removed");
assert.match(css, /\.app-shell\s*{[\s\S]*height:\s*100dvh;/, "app shell should fit one dynamic viewport");
assert.ok(css.includes("@media (max-aspect-ratio"), "layout should adapt to narrower display ratios");
assert.ok(css.includes("@media (max-height"), "layout should compact on shorter displays");
assert.match(css, /\.schedule-card\s*{[\s\S]*min-height:\s*0;/, "schedule card should not force overflow");
assert.match(css, /\.info-card\s*{[\s\S]*min-height:\s*0;/, "summary cards should not force tall blanks");
assert.match(css, /\.info-card\s*{[\s\S]*height:\s*100%;/, "summary cards should share one equal height");
assert.match(css, /\.info-grid\s*{[\s\S]*align-items:\s*stretch;/, "summary card grid should stretch all cards equally");
assert.match(css, /\.main-panel\s*{[\s\S]*grid-template-rows:[\s\S]*50vh[\s\S]*31vh/, "main panel should give the schedule more height before the summary cards");
assert.match(css, /\.status-panel\s*{[\s\S]*display:\s*block;/, "status panel should use reference-style anchored vertical proportions");
assert.match(css, /\.timeline-card\s*{[\s\S]*overflow:\s*hidden;/, "availability card should contain its own content");
assert.match(legendBlock, /grid-template-columns:/, "availability legend should be constrained inside the card");
assert.match(legendBlock, /grid-auto-flow:\s*column;/, "availability legend should prefer one row");
assert.match(legendBlock, /justify-content:\s*space-between;/, "availability legend should distribute labels across the full timeline width");
assert.match(legendBlock, /white-space:\s*nowrap;/, "availability legend labels should stay on one line");

console.log("Layout structure tests passed.");
