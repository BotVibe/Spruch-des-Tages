"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const TIMEZONE = "Europe/Berlin";
const LANGUAGE_TAG = "de";
const VERSION_ID = 73; // Hoffnung für alle (Hfa) — YouVersion-Standard für Deutsch

const YV_HEADERS = {
  Accept: "application/json",
  "User-Agent": "SpruchDesTages/1.0 (+https://bible.com)",
  "X-YouVersion-Client": "youversion",
  "X-YouVersion-App-Platform": "web",
  "X-YouVersion-App-Version": "1",
  Referer: "https://www.bible.com/",
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

function dayOfYearInTimezone(date = new Date(), timeZone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86_400_000);
}

function absoluteImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: YV_HEADERS });
  if (!response.ok) {
    throw new Error(`YouVersion ${response.status} for ${url}`);
  }
  return response.json();
}

async function getVerseOfTheDay() {
  const day = dayOfYearInTimezone();
  const calendar = await fetchJson(
    "https://moments.youversionapi.com/3.1/votd.json"
  );
  const entries = calendar?.response?.data;
  if (!Array.isArray(entries)) {
    throw new Error("Ungültige VOTD-Kalenderantwort");
  }

  const entry = entries.find((item) => item.day === day);
  if (!entry?.usfm?.length) {
    throw new Error(`Kein Vers für Tag ${day} gefunden`);
  }

  const usfm = entry.usfm;
  const primaryUsfm = usfm[0];

  const imagesUrl = new URL("https://images.youversionapi.com/3.1/items.json");
  imagesUrl.searchParams.set("language_tag", LANGUAGE_TAG);
  for (const ref of usfm) {
    imagesUrl.searchParams.append("usfm[]", ref);
  }

  const imagesPayload = await fetchJson(imagesUrl.toString());
  const images = imagesPayload?.response?.data?.images || [];
  const preferred =
    images.find((img) => img.category === "prerendered") || images[0];

  let imageUrl = null;
  if (preferred?.renditions?.length) {
    const best = [...preferred.renditions].sort(
      (a, b) => (b.width || 0) - (a.width || 0)
    )[0];
    imageUrl = absoluteImageUrl(best.url);
  } else if (preferred?.id) {
    imageUrl = `https://imageproxy.youversionapi.com/1280x1280/https://s3.amazonaws.com/static-youversionapi-com/images/base/${preferred.id}/1280x1280.jpg`;
  }

  let reference = primaryUsfm;
  let version = "Hfa";
  try {
    const verseUrl = new URL("https://bible.youversionapi.com/3.1/verse.json");
    verseUrl.searchParams.set("id", String(VERSION_ID));
    verseUrl.searchParams.set("reference", primaryUsfm);
    const versePayload = await fetchJson(verseUrl.toString());
    const data = versePayload?.response?.data;
    if (data?.reference?.human) {
      reference = data.reference.human;
    }
  } catch {
    // Referenz aus USFM ableiten, falls Vers-API ausfällt
    reference = primaryUsfm.replace(/\./g, " ");
  }

  if (!imageUrl) {
    throw new Error("Kein YouVersion-Versbild gefunden");
  }

  return {
    day,
    usfm,
    reference,
    version,
    versionId: VERSION_ID,
    imageUrl,
    imageId: preferred?.id ?? null,
    attribution: "Bible.com / YouVersion",
    fetchedAt: new Date().toISOString(),
  };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      res.end(err.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control":
        ext === ".html" ? "no-cache" : "public, max-age=86400",
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "GET" && requestUrl.pathname === "/api/votd") {
    try {
      const data = await getVerseOfTheDay();
      sendJson(res, 200, data);
    } catch (error) {
      console.error(error);
      sendJson(res, 502, {
        error: "Vers des Tages konnte nicht geladen werden.",
        detail: String(error.message || error),
      });
    }
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end("Method Not Allowed");
    return;
  }

  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === "/") pathname = "/index.html";
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  sendFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Spruch des Tages läuft auf http://localhost:${PORT}`);
});
