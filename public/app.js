(() => {
  const TIMEZONE = "Europe/Berlin";
  const LANGUAGE_TAG = "de";
  const VERSION = "Hfa";
  const ATTRIBUTION = "Bible.com / YouVersion";

  const YV_HEADERS = {
    Accept: "application/json",
    "X-YouVersion-Client": "youversion",
    "X-YouVersion-App-Platform": "web",
    "X-YouVersion-App-Version": "1",
  };

  const BOOK_NAMES_DE = {
    GEN: "1. Mose",
    EXO: "2. Mose",
    LEV: "3. Mose",
    NUM: "4. Mose",
    DEU: "5. Mose",
    JOS: "Josua",
    JDG: "Richter",
    RUT: "Ruth",
    "1SA": "1. Samuel",
    "2SA": "2. Samuel",
    "1KI": "1. Könige",
    "2KI": "2. Könige",
    "1CH": "1. Chronik",
    "2CH": "2. Chronik",
    EZR: "Esra",
    NEH: "Nehemia",
    EST: "Esther",
    JOB: "Hiob",
    PSA: "Psalm",
    PRO: "Sprüche",
    ECC: "Prediger",
    SNG: "Hohelied",
    ISA: "Jesaja",
    JER: "Jeremia",
    LAM: "Klagelieder",
    EZK: "Hesekiel",
    DAN: "Daniel",
    HOS: "Hosea",
    JOL: "Joel",
    AMO: "Amos",
    OBA: "Obadja",
    JON: "Jona",
    MIC: "Micha",
    NAM: "Nahum",
    HAB: "Habakuk",
    ZEP: "Zephanja",
    HAG: "Haggai",
    ZEC: "Sacharja",
    MAL: "Maleachi",
    MAT: "Matthäus",
    MRK: "Markus",
    LUK: "Lukas",
    JHN: "Johannes",
    ACT: "Apostelgeschichte",
    ROM: "Römer",
    "1CO": "1. Korinther",
    "2CO": "2. Korinther",
    GAL: "Galater",
    EPH: "Epheser",
    PHP: "Philipper",
    COL: "Kolosser",
    "1TH": "1. Thessalonicher",
    "2TH": "2. Thessalonicher",
    "1TI": "1. Timotheus",
    "2TI": "2. Timotheus",
    TIT: "Titus",
    PHM: "Philemon",
    HEB: "Hebräer",
    JAS: "Jakobus",
    "1PE": "1. Petrus",
    "2PE": "2. Petrus",
    "1JN": "1. Johannes",
    "2JN": "2. Johannes",
    "3JN": "3. Johannes",
    JUD: "Judas",
    REV: "Offenbarung",
  };

  const statusEl = document.getElementById("status");
  const frameEl = document.getElementById("verse-frame");
  const imageEl = document.getElementById("verse-image");
  const captionEl = document.getElementById("verse-caption");
  const chromeEl = document.getElementById("chrome");
  const printBtn = document.getElementById("print-btn");

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
    return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86_400_000);
  }

  function absoluteImageUrl(url) {
    if (!url) return null;
    if (url.startsWith("//")) return `https:${url}`;
    return url;
  }

  function formatReference(usfmList) {
    const primary = usfmList[0] || "";
    const [book, chapter, verse] = primary.split(".");
    const bookName = BOOK_NAMES_DE[book] || book;
    if (!chapter) return primary;
    if (!verse) return `${bookName} ${chapter}`;

    const last = usfmList[usfmList.length - 1] || primary;
    const lastVerse = last.split(".")[2];
    if (lastVerse && lastVerse !== verse) {
      return `${bookName} ${chapter}:${verse}-${lastVerse}`;
    }
    return `${bookName} ${chapter}:${verse}`;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: YV_HEADERS });
    if (!response.ok) {
      throw new Error(`YouVersion ${response.status}`);
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
      throw new Error(`Kein Vers für Tag ${day}`);
    }

    const usfm = entry.usfm;
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

    if (!imageUrl) {
      throw new Error("Kein YouVersion-Versbild gefunden");
    }

    return {
      day,
      usfm,
      reference: formatReference(usfm),
      version: VERSION,
      imageUrl,
      attribution: ATTRIBUTION,
    };
  }

  function showError(message) {
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.classList.add("is-error");
    frameEl.hidden = true;
    chromeEl.hidden = true;
  }

  function showVerse(data) {
    const label = `${data.reference} (${data.version})`;
    imageEl.src = data.imageUrl;
    imageEl.alt = `Vers des Tages: ${label}`;
    captionEl.textContent = `${label} — ${data.attribution}`;
    document.title = `${data.reference} — Vers des Tages`;

    imageEl.onload = () => {
      statusEl.hidden = true;
      frameEl.hidden = false;
      chromeEl.hidden = false;
    };

    imageEl.onerror = () => {
      showError("Das Versbild konnte nicht geladen werden.");
    };
  }

  printBtn.addEventListener("click", () => {
    window.print();
  });

  async function load() {
    try {
      const data = await getVerseOfTheDay();
      showVerse(data);
    } catch (error) {
      console.error(error);
      showError("Der Vers des Tages ist gerade nicht erreichbar.");
    }
  }

  load();
})();
