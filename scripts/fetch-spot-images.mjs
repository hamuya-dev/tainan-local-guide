#!/usr/bin/env node
/**
 * Fetch main spot photos from linked blog posts, resize to max width 720px,
 * compress to WebP (~50-90KB target), save to images/spots/<spot.id>.webp,
 * and write "image": "images/spots/<spot.id>.webp" into data/spots.json.
 *
 * Usage:
 *   node scripts/fetch-spot-images.mjs [--overwrite] [--dry-run] [--only=id1,id2] [--quality=80] [--width=720]
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SPOTS_PATH = path.join(ROOT_DIR, "data/spots.json");
const IMAGES_DIR = path.join(ROOT_DIR, "images/spots");

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// CLI args
const args = process.argv.slice(2);
const OVERWRITE = args.includes("--overwrite");
const DRY_RUN = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY_IDS = onlyArg
  ? new Set(
      onlyArg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  : null;
const qualityArg = args.find((a) => a.startsWith("--quality="));
const WEBP_QUALITY = qualityArg ? Number(qualityArg.slice("--quality=".length)) || 80 : 80;
const widthArg = args.find((a) => a.startsWith("--width="));
const TARGET_WIDTH = widthArg ? Number(widthArg.slice("--width=".length)) || 720 : 720;

// Traditional Chinese <-> Japanese Shinjitai normalization map for matching spot titles in JP blog posts
const KANJI_NORM_MAP = new Map([
  ["臺", "台"],
  ["吳", "呉"],
  ["藝", "芸"],
  ["麵", "麺"],
  ["專", "専"],
  ["賣", "売"],
  ["樓", "楼"],
  ["雞", "鶏"],
  ["燒", "焼"],
  ["樂", "楽"],
  ["廣", "広"],
  ["國", "国"],
  ["圓", "円"],
  ["灣", "湾"],
  ["點", "点"],
  ["號", "号"],
  ["區", "区"],
  ["黑", "黒"],
  ["貓", "猫"],
  ["豬", "猪"],
  ["雙", "双"],
  ["萬", "万"],
  ["鹽", "塩"],
  ["廳", "庁"],
  ["藥", "薬"],
  ["鐵", "鉄"],
  ["氣", "気"],
  ["濱", "浜"],
  ["寶", "宝"],
  ["舊", "旧"],
  ["櫻", "桜"],
  ["獨", "独"],
  ["壓", "圧"],
  ["關", "関"],
  ["學", "学"],
  ["經", "経"],
  ["總", "総"],
  ["壽", "寿"],
  ["會", "会"],
  ["團", "団"],
  ["邊", "辺"],
  ["豐", "豊"],
  ["飯", "飯"],
  ["館", "館"],
  ["魚", "魚"],
  ["鮮", "鮮"],
  ["魯", "魯"],
  ["鹹", "鹹"],
  ["廠", "廠"],
  ["實", "実"],
  ["誠", "誠"],
  ["園", "園"],
  ["圖", "図"],
  ["書", "書"],
  ["環", "環"],
  ["觀", "観"],
  ["聯", "聯"],
  ["條", "条"],
  ["來", "来"],
]);

function normalizeText(str) {
  if (!str) return "";
  let out = String(str)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　・･·\.\-‐‑–—―_\/\\\(\)（）「」『』【】\[\]!?！？、。,，:：~〜～]/g, "");
  let res = "";
  for (const ch of out) {
    res += KANJI_NORM_MAP.get(ch) || ch;
  }
  return res;
}

function decodeHtmlEntities(str) {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(html) {
  return decodeHtmlEntities(String(html || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getSpotBlogUrl(spot) {
  if (!spot.blog_url || typeof spot.blog_url !== "object") return "";
  for (const lang of ["ja", "zh", "en", "ko"]) {
    const val = spot.blog_url[lang];
    if (typeof val === "string" && val.trim().startsWith("http")) {
      return val.trim();
    }
  }
  return "";
}

function buildSpotKeywords(spot) {
  const rawList = [];
  const zh = spot.name?.zh || "";
  const ja = spot.name?.ja || "";
  const en = spot.name?.en || "";

  if (zh) {
    rawList.push(zh);
    // Split on spaces to capture main brand part (e.g. "紅太陽 台南民族總店" -> "紅太陽")
    const zhParts = zh.split(/\s+/).filter(Boolean);
    if (zhParts[0] && zhParts[0].length >= 2) rawList.push(zhParts[0]);
  }
  if (ja) {
    // Strip parenthetical reading: "好地方冰果室（ハオディーファン）" -> "好地方冰果室"
    const jaNoParen = ja.replace(/[（(][^）)]*[）)]/g, "").trim();
    if (jaNoParen) {
      rawList.push(jaNoParen);
      const jaParts = jaNoParen.split(/\s+/).filter(Boolean);
      if (jaParts[0] && jaParts[0].length >= 2) rawList.push(jaParts[0]);
    }
    // Also check parenthetical reading if katakana/unique (e.g. 台湾ビール善化工場)
    const jaParen = ja.match(/[（(]([^）)]+)[）)]/);
    if (jaParen && jaParen[1]) {
      const p = jaParen[1].trim();
      if (p.length >= 3 && !/^[ァ-ヶー・\s]+$/.test(p)) {
        rawList.push(p);
      }
    }
  }
  if (en && en.length >= 4) {
    rawList.push(en);
  }

  // Spot-specific helpful aliases for known JP blog headings
  const extraAliases = {
    "taiwan-beer-shanhua-brewery": ["台湾ビール善化工場", "善化啤酒廠", "善化工場"],
    "wu-yuan-art-center": ["呉園芸文中心", "吳園"],
    "chimei-museum-tainan": ["奇美博物館"],
    "dong-cai-shi-market": ["東菜市"],
    "guo-ke-ting-omurice": ["過客亭"],
    "shi-jing-jiu-xie-jia-babao-ice": ["謝家八寶冰", "石精臼", "八寶冰"],
    "hei-gong-hao-grass-jelly-chihkan": ["黑工號", "黒工号"],
    "red-sun-tea-minzu": ["紅太陽"],
    "macu-tea-chihkan": ["麻古茶坊", "麻古"],
    "serving-tea-tainan": ["奉茶"],
    "master-of-tea-minzu": ["花茶大師"],
    "qingshan-tea-shop": ["青山茶行", "青山"],
    "tofu-yang-hang-guohua": ["豆腐洋行"],
    "ji-pin-shrimp-rice": ["集品蝦仁飯", "集品"],
    "yuan-wei-wu-japanese-western-food": ["元味屋"],
    "shan-ye-canteen": ["善也食堂", "善也"],
    "wa-yang-ting-manatsu": ["和洋亭", "真夏"],
    "yue-jin-savory-congee": ["悅津鹹粥", "悦津"],
    "dan-dan-burger-chenggong": ["丹丹漢堡", "丹丹"],
    "mumu-seafood-congee": ["木木海鮮粥", "木木"],
    "cheng-shi-guoshou": ["誠實鍋燒", "誠実鍋焼"],
    "chun-xian-fang-guzaowei-guoshou-yimian": ["醇涎坊"],
    "a-mei-xian-kao-guzaowei-dangao": ["阿美現烤", "阿美"],
    "shui-xian-gong-market": ["水仙宮市場", "水仙宮"],
    "paripari-apt-tainan": ["paripari"],
    "donutes-tainan": ["donutes", "多那之"],
    "garden-night-market-tainan": ["花園夜市"],
    "dadong-night-market-tainan": ["大東夜市", "大東東"],
    "wusheng-night-market-tainan": ["武聖夜市"],
    "qiu-jia-douhua": ["邱家豆花", "邱家"],
    "xiao-li-red-bean-cake": ["小李紅豆餅", "小李"],
    "hao-di-fang-bing-guo-shi": ["好地方冰果室", "好地方"],
    "huo-shui-breakfast": ["活水早餐店", "活水"],
  };
  if (extraAliases[spot.id]) {
    rawList.push(...extraAliases[spot.id]);
  }

  const seen = new Set();
  const normalized = [];
  for (const k of rawList) {
    const n = normalizeText(k);
    if (n.length >= 2 && !seen.has(n)) {
      seen.add(n);
      normalized.push(n);
    }
  }
  // Prefer longer (more specific) keywords first
  normalized.sort((a, b) => b.length - a.length);
  return normalized;
}

const EXCLUDE_URL_RE =
  /(?:logo|icon|avatar|gravatar|emoji|s\.w\.org|wp-includes|\/themes\/|favicon|qr[-_]?code|line[-_]?qr|banner|(?:^|[/_-])(?:ad|ads|advert)(?:[/_.-]|$)|affiliate|a8\.net|rakuten|amazon|instagram|facebook|twitter|sns|share|button|profile|hamusan|7b6cf1bf8cd4fabc39d27de835dde40c|B9056B10-F196-41F8-9971-E1CEEFC89B91)/i;

const EXCLUDE_CLASS_RE =
  /(?:c-headLogo|c-footLogo|avatar|emoji|icon|sns|qr|banner|profile|author)/i;

function extractAttr(attrs, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = attrs.match(re);
  if (!m) return "";
  return decodeHtmlEntities(m[1] ?? m[2] ?? m[3] ?? "").trim();
}

function resolveImgUrl(attrs, baseUrl) {
  const candidates = [
    extractAttr(attrs, "data-src"),
    extractAttr(attrs, "data-lazy-src"),
    extractAttr(attrs, "data-original"),
    extractAttr(attrs, "src"),
  ].filter(Boolean);

  for (const raw of candidates) {
    if (raw.startsWith("data:")) continue;
    try {
      return new URL(raw, baseUrl).href;
    } catch {
      continue;
    }
  }
  return "";
}

function isExcludedImg(url, attrs = "", allowPostThumb = false) {
  if (!url || !/^https?:\/\//i.test(url)) return true;
  if (/\.(?:svg|ico|gif)(?:\?|$)/i.test(url)) return true;
  if (EXCLUDE_URL_RE.test(url)) return true;
  const cls = extractAttr(attrs, "class");
  if (EXCLUDE_CLASS_RE.test(cls)) return true;
  if (!allowPostThumb && /c-postThumb__img/i.test(cls)) return true;
  // Reject tiny explicit dimensions
  const w = Number(extractAttr(attrs, "width")) || 0;
  const h = Number(extractAttr(attrs, "height")) || 0;
  if ((w > 0 && w < 220) || (h > 0 && h < 160)) return true;
  // Reject WordPress small thumbnails like -150x150 or -300x225 unless upgraded
  if (/-(?:150x150|100x100|80x80)\.[a-z]+$/i.test(url)) return true;
  return false;
}

function upgradeWpThumbUrl(url) {
  // Upgrade tiny WordPress 300x* thumbnails if encountered on archive cards
  return url.replace(/-(?:300x\d+|\d+x300)(\.[a-z]+)$/i, "-1024x768$1");
}

function extractMainContentHtml(html) {
  // SWELL theme uses <div class="post_content"> ... </div> followed by related posts / sidebar
  let start = html.indexOf('<div class="post_content">');
  if (start === -1) {
    const m = html.match(/<div[^>]+class="[^"]*(?:entry-content|post_content|post-content)[^"]*"[^>]*>/i);
    if (m) start = m.index;
  }
  if (start === -1) {
    const m = html.match(/<article\b[^>]*>/i);
    if (m) start = m.index;
  }
  if (start === -1) start = 0;

  let chunk = html.slice(start);
  const stopMarkers = [
    "p-relatedPosts",
    "l-articleBottom",
    "関連記事",
    "p-authorBox",
    'id="sidebar"',
    "l-sidebar",
    "</article>",
  ];
  let end = chunk.length;
  for (const marker of stopMarkers) {
    const idx = chunk.indexOf(marker);
    if (idx !== -1 && idx < end) {
      end = idx;
    }
  }
  return chunk.slice(0, end);
}

function extractSingleSpotCandidates(html, pageUrl) {
  const candidates = [];
  const seen = new Set();
  const push = (url) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    candidates.push(url);
  };

  // 1. Featured eyecatch image (SWELL p-articleThumb__img)
  const thumbRe = /<img\b([^>]*p-articleThumb__img[^>]*)>/gi;
  for (const m of html.matchAll(thumbRe)) {
    const u = resolveImgUrl(m[1], pageUrl);
    if (!isExcludedImg(u, m[1], false)) push(u);
  }

  // 2. og:image meta tag
  const ogRe = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
  for (const m of html.matchAll(ogRe)) {
    const u = decodeHtmlEntities(m[1]).trim();
    if (!isExcludedImg(u, "", false)) push(u);
  }
  const ogRe2 = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi;
  for (const m of html.matchAll(ogRe2)) {
    const u = decodeHtmlEntities(m[1]).trim();
    if (!isExcludedImg(u, "", false)) push(u);
  }

  // 3. Content body images inside .post_content (before related posts / weather / today's 1 photo)
  const contentHtml = extractMainContentHtml(html);
  const imgRe = /<img\b([^>]*)>/gi;
  for (const m of contentHtml.matchAll(imgRe)) {
    const u = resolveImgUrl(m[1], pageUrl);
    if (!isExcludedImg(u, m[1], false)) push(u);
  }

  return candidates;
}

function extractCategoryMatches(html, pageUrl, spots) {
  // Parse post list cards: <li class="p-postList__item"> or <article>
  const cards = [];
  const itemRe = /<(?:li|article)\b[^>]*class="[^"]*p-postList__item[^"]*"[^>]*>([\s\S]*?)<\/(?:li|article)>/gi;
  for (const m of html.matchAll(itemRe)) {
    const block = m[1];
    const titleMatch = block.match(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const imgMatch = block.match(/<img\b([^>]*)>/i);
    const linkMatch = block.match(/<a\b[^>]*href=["']([^"']+)["']/i);
    if (!titleMatch) continue;
    const title = stripTags(titleMatch[1]);
    const imgUrl = imgMatch ? resolveImgUrl(imgMatch[1], pageUrl) : "";
    const href = linkMatch ? decodeHtmlEntities(linkMatch[1]) : "";
    cards.push({
      title,
      normTitle: normalizeText(title),
      imgUrl: imgUrl && !isExcludedImg(imgUrl, imgMatch?.[1] || "", true) ? imgUrl : "",
      href,
    });
  }

  const result = new Map();
  for (const spot of spots) {
    const keywords = buildSpotKeywords(spot);
    let matched = null;
    for (const kw of keywords) {
      matched = cards.find((c) => c.normTitle.includes(kw));
      if (matched) break;
    }
    if (matched && matched.imgUrl) {
      result.set(spot.id, [matched.imgUrl]);
    } else {
      result.set(spot.id, []);
    }
  }
  return result;
}

function extractRoundupMatches(html, pageUrl, spots) {
  const contentHtml = extractMainContentHtml(html);

  // Build ordered token stream of text blocks and valid content images
  const tokens = [];
  const tokenRe = /<(h[2-4]|p|figcaption|li|dt|dd)\b[^>]*>([\s\S]*?)<\/\1>|<img\b([^>]*)>/gi;

  for (const m of contentHtml.matchAll(tokenRe)) {
    if (m[1]) {
      const tag = m[1].toLowerCase();
      const rawInner = m[2];
      const text = stripTags(rawInner);
      // Stop before unrelated footer sections common in Hamuya diary posts
      if (
        /^h[2-4]$/.test(tag) &&
        /(?:今日の台南の天気|今日の[１1]枚|関連記事|まとめ|おすすめグルメ)/.test(text)
      ) {
        break;
      }
      if (text) {
        tokens.push({ type: "text", tag, text, norm: normalizeText(text) });
      }
      // Also capture any <img> nested inside <p> / <figure> / <li>!
      const nestedImgRe = /<img\b([^>]*)>/gi;
      for (const im of rawInner.matchAll(nestedImgRe)) {
        const u = resolveImgUrl(im[1], pageUrl);
        if (!isExcludedImg(u, im[1], false)) {
          tokens.push({ type: "img", url: u });
        }
      }
    } else if (m[3]) {
      const u = resolveImgUrl(m[3], pageUrl);
      if (!isExcludedImg(u, m[3], false)) {
        tokens.push({ type: "img", url: u });
      }
    }
  }

  // Locate first mention index for each spot (prefer headings / numbered titles over casual body mentions)
  const positions = [];
  for (const spot of spots) {
    const keywords = buildSpotKeywords(spot);
    let bestIdx = -1;
    let bestScore = -1;

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (tok.type !== "text") continue;
      for (const kw of keywords) {
        if (tok.norm.includes(kw)) {
          // Prefer headings or short title-like paragraphs (e.g. "１．好地方冰果室")
          let score = kw.length;
          if (/^h[2-4]$/.test(tok.tag)) score += 100;
          else if (tok.text.length <= 45) score += 60;
          if (/^[０-９0-9①-⑩]/.test(tok.text)) score += 30;
          if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
          }
          break;
        }
      }
    }
    if (bestIdx !== -1) {
      positions.push({ spot, idx: bestIdx });
    }
  }

  // Sort matched spots by appearance order in the article
  positions.sort((a, b) => a.idx - b.idx);

  const result = new Map();
  const usedUrls = new Set();

  for (let p = 0; p < positions.length; p++) {
    const { spot, idx } = positions[p];
    const nextIdx = p + 1 < positions.length ? positions[p + 1].idx : tokens.length;
    const candidates = [];

    // Look forward inside this spot's section (avoid grabbing unrelated preceding maps/headers)
    for (let i = idx + 1; i < nextIdx; i++) {
      if (tokens[i].type === "text" && /^(?:おすすめグルメ|各夜市の特徴)$/.test(tokens[i].text.trim())) {
        break;
      }
      if (tokens[i].type === "img" && !usedUrls.has(tokens[i].url)) {
        candidates.push(tokens[i].url);
      }
    }

    if (candidates.length > 0) {
      usedUrls.add(candidates[0]);
    }
    result.set(spot.id, candidates);
  }

  // Ensure every spot in this group has an entry
  for (const spot of spots) {
    if (!result.has(spot.id)) {
      result.set(spot.id, []);
    }
  }

  return result;
}

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

let sharpModule = null;
let cwebpBin = null;

async function initImageEncoder() {
  try {
    const mod = await import("sharp");
    sharpModule = mod.default || mod;
    return "sharp";
  } catch {
    // Fall back to sips + cwebp if available
    for (const candidate of ["cwebp", "/opt/homebrew/bin/cwebp", "/usr/local/bin/cwebp"]) {
      try {
        execFileSync(candidate, ["-version"], { stdio: "ignore" });
        cwebpBin = candidate;
        return "cwebp";
      } catch {
        continue;
      }
    }
    throw new Error(
      'No WebP encoder available. Run "npm install" (for sharp) or "brew install webp" (for cwebp).'
    );
  }
}

async function convertBufferToWebp(buffer, outPath) {
  if (sharpModule) {
    const img = sharpModule(buffer, { failOn: "none" });
    const meta = await img.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (w < 260 || h < 180) {
      return { ok: false, reason: `too small (${w}x${h})` };
    }
    const ratio = w / h;
    if (ratio > 3.2 || ratio < 0.35) {
      return { ok: false, reason: `extreme aspect ratio (${w}x${h})` };
    }

    let webpBuf = await sharpModule(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 5 })
      .toBuffer();

    // Keep images lean (~50-95KB target)
    if (webpBuf.length > 105 * 1024 && WEBP_QUALITY > 72) {
      webpBuf = await sharpModule(buffer, { failOn: "none" })
        .rotate()
        .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
        .webp({ quality: 72, effort: 5 })
        .toBuffer();
    }

    const outMeta = await sharpModule(webpBuf).metadata();
    if (!DRY_RUN) {
      fs.writeFileSync(outPath, webpBuf);
    }
    return { ok: true, bytes: webpBuf.length, width: outMeta.width, height: outMeta.height };
  }

  // Fallback: sips resize + cwebp encode
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spot-img-"));
  try {
    const inFile = path.join(tmpDir, "in.img");
    const pngFile = path.join(tmpDir, "resized.png");
    fs.writeFileSync(inFile, buffer);
    const props = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", inFile], {
      encoding: "utf8",
    });
    const w = Number((props.match(/pixelWidth:\s*(\d+)/) || [])[1]) || 0;
    const h = Number((props.match(/pixelHeight:\s*(\d+)/) || [])[1]) || 0;
    if (w < 260 || h < 180) {
      return { ok: false, reason: `too small (${w}x${h})` };
    }
    if (w > TARGET_WIDTH) {
      execFileSync("sips", ["--resampleWidth", String(TARGET_WIDTH), "-s", "format", "png", inFile, "--out", pngFile], {
        stdio: "ignore",
      });
    } else {
      execFileSync("sips", ["-s", "format", "png", inFile, "--out", pngFile], { stdio: "ignore" });
    }
    const tmpOut = path.join(tmpDir, "out.webp");
    execFileSync(cwebpBin, ["-quiet", "-q", String(WEBP_QUALITY), pngFile, "-o", tmpOut], {
      stdio: "ignore",
    });
    const webpBuf = fs.readFileSync(tmpOut);
    if (!DRY_RUN) {
      fs.writeFileSync(outPath, webpBuf);
    }
    return { ok: true, bytes: webpBuf.length, width: Math.min(w, TARGET_WIDTH), height: Math.round((h * Math.min(w, TARGET_WIDTH)) / w) };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIdx = 0;
  async function runner() {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

async function main() {
  const encoder = await initImageEncoder();
  console.log(`🔧 Image encoder: ${encoder} (width=${TARGET_WIDTH}px, quality=${WEBP_QUALITY}, overwrite=${OVERWRITE}, dryRun=${DRY_RUN})`);

  const rawSpots = fs.readFileSync(SPOTS_PATH, "utf8");
  const spots = JSON.parse(rawSpots);
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  // Group spots with blog URLs
  const spotsByUrl = new Map();
  for (const spot of spots) {
    if (ONLY_IDS && !ONLY_IDS.has(spot.id)) continue;
    const blogUrl = getSpotBlogUrl(spot);
    if (!blogUrl) continue;
    if (!spotsByUrl.has(blogUrl)) spotsByUrl.set(blogUrl, []);
    spotsByUrl.get(blogUrl).push(spot);
  }

  const totalTargeted = [...spotsByUrl.values()].reduce((acc, arr) => acc + arr.length, 0);
  console.log(`📚 Found ${totalTargeted} spots across ${spotsByUrl.size} unique blog URLs.`);

  // Step 1: Fetch HTML for each unique blog URL (skip URL if all its spots already have images and !OVERWRITE)
  const urlEntries = [...spotsByUrl.entries()];
  const candidateMap = new Map(); // spot.id -> { candidates: string[], error?: string }

  await runWithConcurrency(urlEntries, 4, async ([url, groupSpots]) => {
    const needsFetch = groupSpots.some((s) => {
      const rel = `images/spots/${s.id}.webp`;
      const abs = path.join(ROOT_DIR, rel);
      return OVERWRITE || !fs.existsSync(abs);
    });
    if (!needsFetch) {
      for (const s of groupSpots) {
        candidateMap.set(s.id, { skippedExisting: true, candidates: [] });
      }
      return;
    }

    try {
      const res = await fetchWithTimeout(url, 15000);
      const html = await res.text();
      const finalUrl = res.url || url;

      if (/\/category\//i.test(finalUrl)) {
        const matches = extractCategoryMatches(html, finalUrl, groupSpots);
        for (const s of groupSpots) {
          candidateMap.set(s.id, { candidates: matches.get(s.id) || [] });
        }
      } else if (groupSpots.length === 1) {
        const cands = extractSingleSpotCandidates(html, finalUrl);
        candidateMap.set(groupSpots[0].id, { candidates: cands });
      } else {
        const matches = extractRoundupMatches(html, finalUrl, groupSpots);
        for (const s of groupSpots) {
          candidateMap.set(s.id, { candidates: matches.get(s.id) || [] });
        }
      }
    } catch (err) {
      for (const s of groupSpots) {
        candidateMap.set(s.id, { candidates: [], error: `page fetch failed: ${err.message}` });
      }
    }
  });

  // Step 2: Download & convert images for each targeted spot
  const allTargetSpots = urlEntries.flatMap(([, arr]) => arr);
  const summary = {
    saved: [],
    skipped: [],
    failed: [],
  };

  await runWithConcurrency(allTargetSpots, 4, async (spot) => {
    const relPath = `images/spots/${spot.id}.webp`;
    const absPath = path.join(ROOT_DIR, relPath);
    const info = candidateMap.get(spot.id) || { candidates: [] };

    if (!OVERWRITE && fs.existsSync(absPath)) {
      spot.image = relPath;
      const stat = fs.statSync(absPath);
      summary.skipped.push({ id: spot.id, bytes: stat.size, path: relPath });
      return;
    }

    if (info.error) {
      summary.failed.push({ id: spot.id, url: getSpotBlogUrl(spot), reason: info.error });
      return;
    }

    if (!info.candidates || info.candidates.length === 0) {
      summary.failed.push({ id: spot.id, url: getSpotBlogUrl(spot), reason: "no matching photo found in article" });
      return;
    }

    let lastReason = "unknown error";
    for (const imgUrl of info.candidates.slice(0, 6)) {
      try {
        const res = await fetchWithTimeout(imgUrl, 15000);
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          lastReason = `non-image content-type (${contentType})`;
          continue;
        }
        const arrBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrBuf);
        if (buf.length < 4000) {
          lastReason = `image payload too small (${buf.length}B)`;
          continue;
        }
        const conv = await convertBufferToWebp(buf, absPath);
        if (!conv.ok) {
          lastReason = conv.reason;
          continue;
        }
        spot.image = relPath;
        summary.saved.push({
          id: spot.id,
          path: relPath,
          bytes: conv.bytes,
          width: conv.width,
          height: conv.height,
          source: imgUrl,
        });
        console.log(
          `  ✅ ${spot.id} -> ${relPath} (${conv.width}x${conv.height}, ${(conv.bytes / 1024).toFixed(1)} KB)`
        );
        return;
      } catch (err) {
        lastReason = `image fetch/convert error: ${err.message}`;
      }
    }

    summary.failed.push({ id: spot.id, url: getSpotBlogUrl(spot), reason: lastReason });
    console.log(`  ⚠️  ${spot.id} -> failed (${lastReason})`);
  });

  // Step 3: Write updated spots.json
  if (!DRY_RUN) {
    fs.writeFileSync(SPOTS_PATH, JSON.stringify(spots, null, 2) + "\n", "utf8");
  }

  // Summary Report
  const allOk = [...summary.saved, ...summary.skipped];
  const totalBytes = allOk.reduce((acc, x) => acc + x.bytes, 0);
  const avgKb = allOk.length ? totalBytes / allOk.length / 1024 : 0;

  console.log("\n================ SUMMARY ================");
  console.log(`Saved new : ${summary.saved.length}`);
  console.log(`Skipped   : ${summary.skipped.length}`);
  console.log(`Failed    : ${summary.failed.length}`);
  console.log(
    `Total imgs: ${allOk.length} | Total size: ${(totalBytes / 1024).toFixed(1)} KB (${(
      totalBytes /
      (1024 * 1024)
    ).toFixed(2)} MB) | Avg: ${avgKb.toFixed(1)} KB/img`
  );
  if (summary.failed.length > 0) {
    console.log("\nFailed / Unmatched spots:");
    for (const f of summary.failed) {
      console.log(`  - ${f.id} (${f.url}): ${f.reason}`);
    }
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
