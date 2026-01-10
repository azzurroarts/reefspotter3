// script.js
const speciesGrid = document.getElementById('species-grid');
const filterSelect = document.getElementById('filter');
const searchInput = document.getElementById('search');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const alphabetContainer = document.getElementById('alphabet');

let speciesData = [];
let unlocked = [];
let activeLetter = null;

// Load CSV
fetch('fish.csv')
  .then((res) => res.text())
  .then((csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines.shift().split(',');
    speciesData = lines.map(line => {
      const values = line.split(',');
      return headers.reduce((obj, header, i) => {
        obj[header] = values[i];
        return obj;
      }, {});
    });
    renderSpecies();
    renderAlphabet();
    updateProgress();
  });

function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.split(regex).map((part, i) =>
    regex.test(part) ? `<mark>${part}</mark>` : part
  ).join('');
}

function renderSpecies() {
  const filter = filterSelect.value;
  const searchTerm = searchInput.value.toLowerCase();
  speciesGrid.innerHTML = '';

  const filtered = speciesData
    .filter(fish => filter === 'All Species' || fish.location === filter)
    .filter(fish =>
      fish.name.toLowerCase().includes(searchTerm) ||
      (fish.scientific_name?.toLowerCase().includes(searchTerm)) ||
      (fish.description?.toLowerCase().includes(searchTerm))
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  filtered.forEach(fish => {
    const cardWrapper = document.createElement('div');

    const card = document.createElement('div');
    card.className = unlocked.includes(fish.id) ? 'species-card unlocked' : 'species-card locked';

    // Image
    const img = document.createElement('img');
    img.src = fish.image_url;
    img.alt = fish.name;
    card.appendChild(img);

    // Name
    const name = document.createElement('h2');
    name.innerHTML = highlightMatch(fish.name, searchInput.value);
    name.style.textAlign = 'center';
    card.appendChild(name);

    // Scientific Name
    const sciName = document.createElement('p');
    sciName.innerHTML = fish.scientific_name;
    sciName.style.fontStyle = 'italic';
    sciName.style.textAlign = 'center';
    card.appendChild(sciName);

    // Description with 3-line clamp
    const desc = document.createElement('p');
    desc.className = 'description';
    desc.innerHTML = highlightMatch(fish.description, searchInput.value);
    card.appendChild(desc);

    // Toggle unlock
    card.addEventListener('click', () => {
      if (unlocked.includes(fish.id)) {
        unlocked = unlocked.filter(id => id !== fish.id);
      } else {
        unlocked.push(fish.id);
      }
      renderSpecies();
      updateProgress();
    });

    cardWrapper.appendChild(card);
    speciesGrid.appendChild(cardWrapper);
  });
}

function updateProgress() {
  const total = speciesData.filter(fish =>
    filterSelect.value === 'All Species' || fish.location === filterSelect.value
  ).length;
  const count = unlocked.length;
  const percent = total ? Math.round((count / total) * 100) : 0;
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;
}

// Alphabet Sidebar
function renderAlphabet() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  alphabetContainer.innerHTML = '';
  alphabet.forEach(letter => {
    const span = document.createElement('span');
    span.textContent = letter;
    span.className = 'alphabet-letter';
    span.addEventListener('click', () => scrollToLetter(letter));
    alphabetContainer.appendChild(span);
  });
}

function scrollToLetter(letter) {
  const cards = Array.from(speciesGrid.children);
  for (let cardWrapper of cards) {
    const nameEl = cardWrapper.querySelector('h2');
    if (nameEl && nameEl.textContent.trim().charAt(0).toUpperCase() === letter) {
      cardWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
  }
}

filterSelect.addEventListener('change', () => {
  renderSpecies();
  updateProgress();
});

searchInput.addEventListener('input', () => {
  renderSpecies();
  updateProgress();
});
