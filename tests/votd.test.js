import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  absoluteImageUrl,
  dayOfYearInTimezone,
  formatReference,
  getVerseOfTheDay,
  pickImageUrl,
} from "../public/votd.js";

describe("dayOfYearInTimezone", () => {
  it("returns 1 for New Year in Europe/Berlin", () => {
    // 2026-01-01 12:00 UTC == midday in Berlin (UTC+1)
    const date = new Date("2026-01-01T12:00:00Z");
    assert.equal(dayOfYearInTimezone(date, "Europe/Berlin"), 1);
  });

  it("returns 263 for 2026-09-20 in Europe/Berlin", () => {
    const date = new Date("2026-09-20T10:00:00Z");
    assert.equal(dayOfYearInTimezone(date, "Europe/Berlin"), 263);
  });

  it("uses Berlin calendar date across UTC midnight", () => {
    // Still Dec 31 evening in Berlin (UTC+1)
    const lateBerlin = new Date("2025-12-31T22:30:00Z");
    assert.equal(dayOfYearInTimezone(lateBerlin, "Europe/Berlin"), 365);

    // Already Jan 1 in Berlin while still Dec 31 afternoon in US timezones
    const earlyBerlin = new Date("2026-01-01T00:30:00+01:00");
    assert.equal(dayOfYearInTimezone(earlyBerlin, "Europe/Berlin"), 1);
  });

  it("handles leap-year day 366", () => {
    const date = new Date("2024-12-31T12:00:00Z");
    assert.equal(dayOfYearInTimezone(date, "Europe/Berlin"), 366);
  });
});

describe("formatReference", () => {
  it("formats a single German verse", () => {
    assert.equal(formatReference(["PSA.9.1"]), "Psalm 9:1");
  });

  it("formats a verse range", () => {
    assert.equal(formatReference(["LAM.3.22", "LAM.3.23"]), "Klagelieder 3:22-23");
  });

  it("falls back to the USFM book code when unknown", () => {
    assert.equal(formatReference(["XYZ.1.2"]), "XYZ 1:2");
  });

  it("formats chapter-only references", () => {
    assert.equal(formatReference(["JHN.3"]), "Johannes 3");
  });
});

describe("absoluteImageUrl", () => {
  it("upgrades protocol-relative URLs", () => {
    assert.equal(
      absoluteImageUrl("//imageproxy.youversionapi.com/1280x1280/x.jpg"),
      "https://imageproxy.youversionapi.com/1280x1280/x.jpg"
    );
  });

  it("returns https URLs unchanged", () => {
    assert.equal(
      absoluteImageUrl("https://example.com/a.jpg"),
      "https://example.com/a.jpg"
    );
  });

  it("returns null for empty input", () => {
    assert.equal(absoluteImageUrl(null), null);
    assert.equal(absoluteImageUrl(""), null);
  });
});

describe("pickImageUrl", () => {
  it("prefers prerendered images and the largest rendition", () => {
    const url = pickImageUrl([
      {
        category: "other",
        renditions: [{ width: 1280, url: "//cdn.example/other.jpg" }],
      },
      {
        category: "prerendered",
        renditions: [
          { width: 320, url: "//cdn.example/small.jpg" },
          { width: 1280, url: "//cdn.example/large.jpg" },
        ],
      },
    ]);
    assert.equal(url, "https://cdn.example/large.jpg");
  });

  it("falls back to image id when renditions are missing", () => {
    const url = pickImageUrl([{ category: "prerendered", id: 85593 }]);
    assert.equal(
      url,
      "https://imageproxy.youversionapi.com/1280x1280/https://s3.amazonaws.com/static-youversionapi-com/images/base/85593/1280x1280.jpg"
    );
  });

  it("returns null when no images are available", () => {
    assert.equal(pickImageUrl([]), null);
    assert.equal(pickImageUrl(undefined), null);
  });
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

describe("getVerseOfTheDay", () => {
  const now = new Date("2026-09-20T10:00:00Z"); // day 263 in Berlin

  it("returns reference and image for a successful response", async function () {
    const fetchMock = async (url) => {
      if (String(url).includes("votd.json")) {
        return jsonResponse({
          response: {
            data: [{ day: 263, usfm: ["PSA.9.1"] }],
          },
        });
      }
      if (String(url).includes("items.json")) {
        assert.match(String(url), /language_tag=de/);
        assert.match(String(url), /usfm%5B%5D=PSA\.9\.1|usfm\[\]=PSA\.9\.1/);
        return jsonResponse({
          response: {
            data: {
              images: [
                {
                  category: "prerendered",
                  id: 85593,
                  renditions: [
                    {
                      width: 1280,
                      url: "//imageproxy.youversionapi.com/1280x1280/base.jpg",
                    },
                  ],
                },
              ],
            },
          },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const result = await getVerseOfTheDay({ fetch: fetchMock, now });
    assert.equal(result.day, 263);
    assert.deepEqual(result.usfm, ["PSA.9.1"]);
    assert.equal(result.reference, "Psalm 9:1");
    assert.equal(result.version, "Hfa");
    assert.equal(
      result.imageUrl,
      "https://imageproxy.youversionapi.com/1280x1280/base.jpg"
    );
    assert.equal(result.attribution, "Bible.com / YouVersion");
  });

  it("throws when the calendar day is missing", async function () {
    const fetchMock = async () =>
      jsonResponse({ response: { data: [{ day: 1, usfm: ["JHN.3.16"] }] } });

    await assert.rejects(
      () => getVerseOfTheDay({ fetch: fetchMock, now }),
      /Kein Vers für Tag 263/
    );
  });

  it("throws when no share image is found", async function () {
    const fetchMock = async (url) => {
      if (String(url).includes("votd.json")) {
        return jsonResponse({
          response: { data: [{ day: 263, usfm: ["PSA.9.1"] }] },
        });
      }
      return jsonResponse({ response: { data: { images: [] } } });
    };

    await assert.rejects(
      () => getVerseOfTheDay({ fetch: fetchMock, now }),
      /Kein YouVersion-Versbild gefunden/
    );
  });

  it("throws on HTTP errors from YouVersion", async function () {
    const fetchMock = async () => jsonResponse({}, 503);

    await assert.rejects(
      () => getVerseOfTheDay({ fetch: fetchMock, now }),
      /YouVersion 503/
    );
  });
});
