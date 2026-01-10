// script.js

// Globals
let species = [];
let unlocked = [];
let filter = "All Species";
let searchTerm = "";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const letterRefs = {};
let activeLetter = null;

// DOM Elements
const speciesGrid = document.querySelector(".species-grid");
const searchInput = document.querySelector("#searchInput");
const filterSelect = document.querySelector("#filterSelect");
const alphabetContainer = document.querySelector(".vertical-alphabet");
const progressBar = document.querySelector(".progress-bar");
const progressText = document.querySelector(".progress-text");

// Load CSV
async function loadCSV() {
  const response = await fetch("fish.csv");
  const csvText = await response.text();
  const rows = csvText.trim().split("\n");
  const headers = rows[0].split(",");
  species = rows.slice(1).map(row => {
    const cols = row.split(",");
    let obj = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i];
    });
    return obj;
  });
  renderSpecies();
  renderAlphabet();
  updateProgress();
}

// Render Species
function renderSpecies() {
  const filtered = species
    .filter(fish => filter === "All Species" || fish.location === filter)
    .filter(fish => {
      const term = searchTerm.toLowerCase();
      return (
        fish.name.toLowerCase().includes(term) ||
        (fish.scientific_name && fish.scientific_name.toLowerCase().includes(term)) ||
        (fish.description && fish.description.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  speciesGrid.innerHTML = "";
  let prevFirstLetter = null;
  filtered.forEach(fish => {
    const firstLetter = fish.name.charAt(0).toUpperCase();
    const cardWrapper = document.createElement("div");

    if (firstLetter !== prevFirstLetter) {
      letterRefs[firstLetter] = cardWrapper;
      prevFirstLetter = firstLetter;
    }

    const card = document.createElement("div");
    card.className = `species-card ${unlocked.includes(fish.name) ? "unlocked" : "locked"}`;
    
    // Click toggle
    card.addEventListener("click", e => {
      e.preventDefault();
      if (unlocked.includes(fish.name)) {
        unlocked = unlocked.filter(n => n !== fish.name);
      } else {
        unlocked.push(fish.name);
      }
      renderSpecies();
      updateProgress();
    });

    const img = document.createElement("img");
    img.src = fish.image_url;
    img.alt = fish.name;

    const title = document.createElement("h2");
    title.innerHTML = highlightMatch(fish.name, searchTerm);
    title.className = "text-center font-bold";

    const sci = document.createElement("p");
    sci.textContent = fish.scientific_name || "";
    sci.className = "text-sm italic text-center";

    const desc = document.createElement("p");
    desc.textContent = fish.description || "";
    desc.className = "text-xs text-center mt-1";

    card.append(img, title, sci, desc);
    cardWrapper.appendChild(card);
    speciesGrid.appendChild(cardWrapper);
  });
}

// Highlight search matches
function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, "gi");
  return text.split(regex).map((part, i) =>
    regex.test(part) ? `<mark class="bg-yellow-300 text-black rounded px-0.5">${part}</mark>` : part
  ).join("");
}

// Render Alphabet
function renderAlphabet() {
  alphabetContainer.innerHTML = "";
  alphabet.forEach(letter => {
    const span = document.createElement("span");
    span.textContent = letter;
    span.className = `alphabet-letter ${activeLetter === letter ? "active" : ""}`;
    span.addEventListener("click", () => scrollToLetter(letter));
    alphabetContainer.appendChild(span);
  });
}

// Scroll to letter
function scrollToLetter(letter) {
  const ref = letterRefs[letter];
  if (ref) {
    ref.scrollIntoView({ behavior: "smooth", block: "start" });
    activeLetter = letter;
    updateAlphabetActive();
  }
}

// Update active alphabet highlight on scroll
window.addEventListener("scroll", () => {
  let closestLetter = null;
  let closestOffset = Infinity;
  Object.entries(letterRefs).forEach(([letter, el]) => {
    const offset = Math.abs(el.getBoundingClientRect().top - 120);
    if (offset < closestOffset) {
      closestOffset = offset;
      closestLetter = letter;
    }
  });
  if (closestLetter) {
    activeLetter = closestLetter;
    updateAlphabetActive();
  }
});

function updateAlphabetActive() {
  document.querySelectorAll(".alphabet-letter").forEach(el => {
    el.classList.toggle("active", el.textContent === activeLetter);
  });
}

// Filter & Searc
