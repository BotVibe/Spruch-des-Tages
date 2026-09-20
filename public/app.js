import { getVerseOfTheDay } from "./votd.js";

const statusEl = document.getElementById("status");
const frameEl = document.getElementById("verse-frame");
const imageEl = document.getElementById("verse-image");
const captionEl = document.getElementById("verse-caption");
const chromeEl = document.getElementById("chrome");
const printBtn = document.getElementById("print-btn");

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
