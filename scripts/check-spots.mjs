#!/usr/bin/env node
/**
 * Lightweight validation harness for data/spots.json
 * Usage: node scripts/check-spots.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPOTS_PATH = path.resolve(__dirname, "../data/spots.json");

const VALID_CATEGORIES = new Set(["local_food", "cafe_sweets", "bar", "sightseeing"]);
const VALID_TIME_SLOTS = new Set(["morning", "lunch", "dinner", "late_night"]);
const VALID_DISTANCES = new Set(["walk_5", "walk_15", "bike_far"]);
const REQUIRED_LANGS = ["ja", "zh", "en", "ko"];

function isValidHttpUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function main() {
  let raw;
  try {
    raw = fs.readFileSync(SPOTS_PATH, "utf8");
  } catch (err) {
    console.error(`❌ Cannot read ${SPOTS_PATH}: ${err.message}`);
    process.exit(1);
  }

  let spots;
  try {
    spots = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Invalid JSON in data/spots.json: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(spots)) {
    console.error("❌ Root of data/spots.json must be a JSON array.");
    process.exit(1);
  }

  const errors = [];
  const warnings = [];
  const seenIds = new Set();

  if (spots.length === 0) {
    warnings.push("data/spots.json contains 0 spots.");
  }

  spots.forEach((spot, index) => {
    const label = `spot[${index}]${spot && typeof spot.id === "string" && spot.id ? ` (${spot.id})` : ""}`;

    if (!spot || typeof spot !== "object" || Array.isArray(spot)) {
      errors.push(`${label}: must be an object.`);
      return;
    }

    // id
    if (typeof spot.id !== "string" || spot.id.trim() === "") {
      errors.push(`${label}: "id" must be a non-empty string.`);
    } else if (seenIds.has(spot.id)) {
      errors.push(`${label}: duplicate id "${spot.id}".`);
    } else {
      seenIds.add(spot.id);
    }

    // category
    if (!VALID_CATEGORIES.has(spot.category)) {
      errors.push(
        `${label}: invalid "category" (${JSON.stringify(spot.category)}). Allowed: ${[...VALID_CATEGORIES].join(", ")}`
      );
    }

    // time_slots
    if (!Array.isArray(spot.time_slots) || spot.time_slots.length === 0) {
      errors.push(`${label}: "time_slots" must be a non-empty array.`);
    } else {
      const seenSlots = new Set();
      spot.time_slots.forEach((slot) => {
        if (!VALID_TIME_SLOTS.has(slot)) {
          errors.push(
            `${label}: invalid time_slot (${JSON.stringify(slot)}). Allowed: ${[...VALID_TIME_SLOTS].join(", ")}`
          );
        } else if (seenSlots.has(slot)) {
          warnings.push(`${label}: duplicate time_slot "${slot}".`);
        }
        seenSlots.add(slot);
      });
    }

    // distance
    if (!VALID_DISTANCES.has(spot.distance)) {
      errors.push(
        `${label}: invalid "distance" (${JSON.stringify(spot.distance)}). Allowed: ${[...VALID_DISTANCES].join(", ")}`
      );
    }

    // Localized required text fields
    for (const field of ["name", "owner_note", "point_and_order"]) {
      const obj = spot[field];
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        errors.push(`${label}: "${field}" must be an object with ${REQUIRED_LANGS.join("/")}.`);
        continue;
      }
      for (const lang of REQUIRED_LANGS) {
        if (typeof obj[lang] !== "string" || obj[lang].trim() === "") {
          errors.push(`${label}: "${field}.${lang}" is missing or empty.`);
        }
      }
    }

    // google_maps_url
    if (!isValidHttpUrl(spot.google_maps_url)) {
      errors.push(`${label}: "google_maps_url" must be a valid http(s) URL (got ${JSON.stringify(spot.google_maps_url)}).`);
    }

    // blog_url (optional per language, but must have ja/zh/en strings and valid URL when non-empty)
    if (!spot.blog_url || typeof spot.blog_url !== "object" || Array.isArray(spot.blog_url)) {
      errors.push(`${label}: "blog_url" must be an object with ${REQUIRED_LANGS.join("/")} keys.`);
    } else {
      for (const lang of REQUIRED_LANGS) {
        const val = spot.blog_url[lang];
        if (typeof val !== "string") {
          errors.push(`${label}: "blog_url.${lang}" must be a string (empty "" if none).`);
        } else if (val.trim() !== "" && !isValidHttpUrl(val)) {
          errors.push(`${label}: "blog_url.${lang}" is not a valid http(s) URL (got ${JSON.stringify(val)}).`);
        }
      }
    }

    // is_active
    if (typeof spot.is_active !== "boolean") {
      errors.push(`${label}: "is_active" must be a boolean (true or false).`);
    }
  });

  warnings.forEach((w) => console.warn(`⚠️  ${w}`));

  if (errors.length > 0) {
    console.error(`\n❌ Validation failed with ${errors.length} error(s):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  const activeCount = spots.filter((s) => s.is_active === true).length;
  console.log(`✅ data/spots.json passed all checks! (${spots.length} spots total, ${activeCount} active)`);
}

main();
