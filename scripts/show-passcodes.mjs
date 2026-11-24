#!/usr/bin/env node
/**
 * Hamuya Tainan Local Guide — Weekly Guest Passcode Schedule (Taiwan Time UTC+8)
 * Passcodes rotate every Monday at 00:00 (UTC+8).
 *
 * Usage:
 *   node scripts/show-passcodes.mjs       # Show current week + next 7 weeks (8 weeks total)
 *   node scripts/show-passcodes.mjs 12    # Show 12 weeks
 */

const TW_OFFSET_MS = 8 * 60 * 60 * 1000;
const PASSCODE_SALT = "hamuya-tainan-guest-2026-v1";
const DAY_MS = 24 * 60 * 60 * 1000;

function getTaiwanIsoWeekInfo(date = new Date()) {
  const tw = new Date(date.getTime() + TW_OFFSET_MS);
  const year = tw.getUTCFullYear();
  const month = tw.getUTCMonth();
  const day = tw.getUTCDate();

  const tmp = new Date(Date.UTC(year, month, day));
  const dayNum = tmp.getUTCDay() || 7; // Mon=1..Sun=7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const isoYear = tmp.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((tmp - yearStart) / DAY_MS + 1) / 7);

  const monday = new Date(Date.UTC(year, month, day - (dayNum - 1)));
  const sunday = new Date(Date.UTC(year, month, day + (7 - dayNum)));
  return { isoYear, isoWeek, monday, sunday };
}

function computeWeeklyPasscode(isoYear, isoWeek) {
  const input = `${PASSCODE_SALT}:${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b1;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (c + i * 31) & 0xff;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  let mixed = (h1 ^ (h2 >>> 13) ^ (h2 << 7)) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b) >>> 0;
  mixed = (mixed ^ (mixed >>> 16)) >>> 0;
  return String(mixed % 10000).padStart(4, "0");
}

function formatUtcDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTaiwanNow(date) {
  const tw = new Date(date.getTime() + TW_OFFSET_MS);
  const hh = String(tw.getUTCHours()).padStart(2, "0");
  const mm = String(tw.getUTCMinutes()).padStart(2, "0");
  return `${formatUtcDate(tw)} ${hh}:${mm} (UTC+8)`;
}

function main() {
  const argWeeks = Number.parseInt(process.argv[2], 10);
  const weeks = Number.isInteger(argWeeks) && argWeeks > 0 && argWeeks <= 52 ? argWeeks : 8;
  const now = new Date();

  console.log("=== はむ家 台南ローカル案内：週替わりパスコード一覧 ===");
  console.log(`基準時刻（台湾時間）: ${formatTaiwanNow(now)}`);
  console.log("切替タイミング      : 毎週月曜 00:00 (UTC+8) / 認証後72時間有効\n");
  console.log("ISO週       | 有効期間（台湾時間 月00:00〜日23:59） | パスコード");
  console.log("------------+-----------------------------------------+-----------");

  for (let i = 0; i < weeks; i++) {
    const target = new Date(now.getTime() + i * 7 * DAY_MS);
    const { isoYear, isoWeek, monday, sunday } = getTaiwanIsoWeekInfo(target);
    const weekLabel = `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
    const code = computeWeeklyPasscode(isoYear, isoWeek);
    const period = `${formatUtcDate(monday)}(月) 〜 ${formatUtcDate(sunday)}(日)`;
    const tag = i === 0 ? "  ◀ 今週" : i === 1 ? "  (来週)" : "";
    console.log(`${weekLabel.padEnd(11)} | ${period.padEnd(39)} | ${code}${tag}`);
  }
}

main();
