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
const VALID_TAGS = new Set([
  "breakfast",
  "late_night",
  "drinks",
  "solo_ok",
  "first_tainan",
  "jp_friendly",
  "vegetarian_ok",
  "animal_cafe",
  "retro",
  "work_friendly",
  "reservation",
]);
const REQUIRED_LANGS = ["ja", "zh", "en", "ko"];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

    // category (single string or non-empty array of valid categories)
    if (typeof spot.category === "string") {
      if (!VALID_CATEGORIES.has(spot.category)) {
        errors.push(
          `${label}: invalid "category" (${JSON.stringify(spot.category)}). Allowed: ${[...VALID_CATEGORIES].join(", ")}`
        );
      }
    } else if (Array.isArray(spot.category) && spot.category.length > 0) {
      const seenCats = new Set();
      spot.category.forEach((cat) => {
        if (!VALID_CATEGORIES.has(cat)) {
          errors.push(
            `${label}: invalid "category" entry (${JSON.stringify(cat)}). Allowed: ${[...VALID_CATEGORIES].join(", ")}`
          );
        } else if (seenCats.has(cat)) {
          warnings.push(`${label}: duplicate category "${cat}".`);
        }
        seenCats.add(cat);
      });
    } else {
      errors.push(
        `${label}: "category" must be a valid string or non-empty array. Allowed: ${[...VALID_CATEGORIES].join(", ")}`
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

    // walk_minutes (optional, positive integer only)
    if (spot.walk_minutes !== undefined) {
      if (!Number.isInteger(spot.walk_minutes) || spot.walk_minutes <= 0 || spot.walk_minutes > 120) {
        errors.push(`${label}: "walk_minutes" must be an integer between 1 and 120 (got ${JSON.stringify(spot.walk_minutes)}).`);
      }
    }

    // tags (optional, max 3 language-independent internal IDs)
    if (spot.tags !== undefined) {
      if (!Array.isArray(spot.tags)) {
        errors.push(`${label}: "tags" must be an array of internal tag IDs.`);
      } else {
        if (spot.tags.length > 3) {
          warnings.push(`${label}: "tags" has ${spot.tags.length} items (recommended max 3).`);
        }
        const seenTags = new Set();
        spot.tags.forEach((tag) => {
          if (typeof tag !== "string" || !VALID_TAGS.has(tag)) {
            errors.push(
              `${label}: invalid tag ID (${JSON.stringify(tag)}). Must be a language-independent ID in: ${[...VALID_TAGS].join(", ")}`
            );
          } else if (seenTags.has(tag)) {
            warnings.push(`${label}: duplicate tag "${tag}".`);
          }
          seenTags.add(tag);
        });
      }
    }

    // hamu_pick (optional boolean flag)
    if (spot.hamu_pick !== undefined && typeof spot.hamu_pick !== "boolean") {
      errors.push(`${label}: "hamu_pick" must be a boolean when provided.`);
    }

    // last_verified (optional schema frame: "" or YYYY-MM-DD)
    if (spot.last_verified !== undefined) {
      if (typeof spot.last_verified !== "string" || (spot.last_verified !== "" && !ISO_DATE_RE.test(spot.last_verified))) {
        errors.push(`${label}: "last_verified" must be "" or YYYY-MM-DD (got ${JSON.stringify(spot.last_verified)}).`);
      }
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

    // blog_url (optional per language, but must have ja/zh/en/ko strings and valid URL when non-empty)
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

    // youtube_url (optional string: "" or valid http(s) URL)
    if (spot.youtube_url !== undefined) {
      if (typeof spot.youtube_url !== "string") {
        errors.push(`${label}: "youtube_url" must be a string (empty "" if none).`);
      } else if (spot.youtube_url.trim() !== "" && !isValidHttpUrl(spot.youtube_url)) {
        errors.push(`${label}: "youtube_url" is not a valid http(s) URL (got ${JSON.stringify(spot.youtube_url)}).`);
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
  const walkCount = spots.filter((s) => Number.isInteger(s.walk_minutes)).length;
  const taggedCount = spots.filter((s) => Array.isArray(s.tags) && s.tags.length > 0).length;
  const pickCount = spots.filter((s) => s.hamu_pick === true).length;
  const youtubeCount = spots.filter((s) => typeof s.youtube_url === "string" && s.youtube_url.trim() !== "").length;
  console.log(
    `✅ data/spots.json passed all checks! (${spots.length} spots total, ${activeCount} active, ${walkCount} with walk_minutes, ${taggedCount} with tags, ${pickCount} hamu_pick, ${youtubeCount} youtube_url)`
  );
}

main();
