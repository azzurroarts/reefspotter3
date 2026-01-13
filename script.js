document.addEventListener('DOMContentLoaded', () => {
  const speciesGrid = document.getElementById('species-grid');
  const searchInput = document.getElementById('search');
  const filterSelect = document.getElementById('filter');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const alphabetContainer = document.getElementById('alphabet');

  let species = [];
  let unlocked = [];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const letterRefs = {};

  // Load CSV
 fetch('fish.csv')
  .then(response => response.text())
  .then(text => {
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    species = lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = values[i]);
      return obj;
    });

    renderSpecies();
    renderAlphabet();
    updateProgress();
  });


  function renderSpecies() {
    const filterValue = filterSelect.value;
    const searchTerm = searchInput.value.toLowerCase();

   const filtered = species
  .filter(f => filterValue === 'All Species' || f.location === filterValue)
  .filter(f =>
    (f.name && f.name.toLowerCase().includes(searchTerm)) ||
    (f.scientific_name && f.scientific_name.toLowerCase().includes(searchTerm)) ||
    (f.description && f.description.toLowerCase().includes(searchTerm))
  )
  .filter(f => f.image_url && f.image_url !== 'UNDEFINED') // <<< skips placeholders
  .sort((a, b) => a.name.localeCompare(b.name));

    speciesGrid.innerHTML = '';

    filtered.forEach((fish, idx, arr) => {
      const firstLetter = fish.name.charAt(0).toUpperCase();
      const prevFirstLetter = idx > 0 ? arr[idx - 1].name.charAt(0).toUpperCase() : null;

      const cardWrapper = document.createElement('div');
      if (firstLetter !== prevFirstLetter) letterRefs[firstLetter] = cardWrapper;

      const card = document.createElement('div');
      card.className = unlocked.includes(fish.name) ? 'species-card unlocked' : 'species-card locked';

      // Image
      if (fish.image_url) {
        const img = document.createElement('img');
        img.src = fish.image_url;
        img.alt = fish.name;
        card.appendChild(img);
      }

      // Name
      if (fish.name) {
        const nameEl = document.createElement('h2');
        nameEl.textContent = fish.name;
        nameEl.style.textAlign = 'center';
        nameEl.style.padding = '0.5rem';
        card.appendChild(nameEl);
      }

      // Scientific name
      if (fish.scientific_name) {
        const sciEl = document.createElement('p');
        sciEl.textContent = fish.scientific_name;
        sciEl.className = 'italic';
        sciEl.style.textAlign = 'center';
        sciEl.style.padding = '0 0.5rem';
        card.appendChild(sciEl);
      }

      // Description
      if (fish.description) {
        const descEl = document.createElement('p');
        descEl.textContent = fish.description;
        descEl.style.textAlign = 'justify';
        descEl.style.padding = '0 0.5rem 0.5rem 0.5rem';
        card.appendChild(descEl);
      }

      card.addEventListener('click', () => {
        card.classList.toggle('locked');
        card.classList.toggle('unlocked');

        if (unlocked.includes(fish.name)) {
          unlocked = unlocked.filter(n => n !== fish.name);
        } else {
          unlocked.push(fish.name);
        }
        updateProgress();
      });

      cardWrapper.appendChild(card);
      speciesGrid.appendChild(cardWrapper);
    });
  }

  function updateProgress() {
    const total = speciesGrid.children.length;
    const unlockedCount = unlocked.length;
    const percent = total ? Math.round((unlockedCount / total) * 100) : 0;
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
  }

  function renderAlphabet() {
    alphabetContainer.innerHTML = '';
    alphabet.forEach(letter => {
      const el = document.createElement('span');
      el.className = 'alphabet-letter';
      el.textContent = letter;
      el.addEventListener('click', () => {
        const ref = letterRefs[letter];
        if (ref) ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      alphabetContainer.appendChild(el);
    });
  }

  searchInput.addEventListener('input', renderSpecies);
  filterSelect.addEventListener('change', renderSpecies);
});
