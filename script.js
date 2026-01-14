document.addEventListener('DOMContentLoaded', () => {
  localStorage.removeItem('reefspotter3_discovered');

  const speciesGrid = document.getElementById('species-grid');
  const searchInput = document.getElementById('search');
  const filterSelect = document.getElementById('filter');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const alphabetContainer = document.getElementById('alphabet');

  // =========================
  // ADDED: Discovery / Mode state
  // =========================
  const STORAGE_KEY = 'reefspotter3_discovered';
  let MODE = 'discovery'; // default user-facing
  let discoveredSet = new Set(
    JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  );

  let species = [];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const letterRefs = {};

  // =========================
  // Robust CSV parser (UNCHANGED)
  // =========================
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (c === ',' && !inQuotes) {
        row.push(field);
        field = '';
        continue;
      }

      if ((c === '\n' || c === '\r') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        row.push(field);
        field = '';
        if (row.some(cell => cell.trim() !== '')) rows.push(row);
        row = [];
        continue;
      }

      field += c;
    }

    if (field.length || row.length) {
      row.push(field);
      if (row.some(cell => cell.trim() !== '')) rows.push(row);
    }

    return rows;
  }

  // =========================
  // Pick helper (UNCHANGED)
  // =========================
  function pick(obj, keys, fallback = '') {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
        return String(obj[k]).trim();
      }
    }
    return fallback;
  }

  // =========================
  // ADDED: illustrated check
  // =========================
  function isIllustrated(f) {
    const raw = pick(f, ['image_url', 'image', 'img', 'filename', 'file'], '');
    const v = raw.toLowerCase();
    return raw && v !== 'undefined' && v !== 'null';
  }

  
function setMode(nextMode) {
  MODE = nextMode;

  const modeToggle = document.getElementById('mode-toggle');
  const modeLabel = document.getElementById('mode-label');

  // Pill shows CURRENT mode (source of truth)
  if (modeToggle) {
    modeToggle.textContent = MODE;
  }

  // Optional helper text (can delete later if annoying)
  if (modeLabel) {
    modeLabel.textContent =
      MODE === 'discovery'
        ? 'discovery'
        : 'catalogue';
  }

  renderSpecies();
  updateProgress();
}


  // =========================
  // CSV load (UNCHANGED except final call)
  // =========================
  function loadCSV() {
    fetch('fish.csv')
      .then(res => {
        if (!res.ok) throw new Error(`fish.csv fetch failed (${res.status})`);
        return res.text();
      })
      .then(text => {
        text = text.replace(/^\uFEFF/, '');

        const rows = parseCSV(text);

        if (!rows.length) throw new Error('No rows parsed from CSV');

        const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
        species = rows.slice(1).map(cols => {
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = (cols[i] ?? '').trim();
          });
          return obj;
        });

        setMode('discovery');
renderAlphabet();
      })
      .catch(err => {
        speciesGrid.innerHTML = `
          <div style="padding:1rem;border:2px solid red;border-radius:12px;margin:1rem;">
            CSV ERROR: ${err.message}
          </div>
        `;
      });
  }

  // =========================
  // renderSpecies (CHANGED surgically)
  // =========================
  function renderSpecies() {
    speciesGrid.innerHTML = '';
    for (const k of Object.keys(letterRefs)) delete letterRefs[k];

    const query = (searchInput.value || '').trim().toLowerCase();
    const filter = filterSelect.value;

    const filtered = species
      .filter(f => {
  if (MODE === 'catalogue') return true;

  // Discovery: hide undrawn fish
  if (!isIllustrated(f)) return false;

  const loc = pick(f, ['location', 'category', 'region', 'tag'], '');
  if (filter === 'All Species') return true;
  return loc === filter;
})

      .filter(f => {
        const name = pick(f, ['name', 'common_name', 'title'], '').toLowerCase();
        const sci = pick(f, ['scientific_name', 'scientific', 'latin_name'], '').toLowerCase();
        return name.includes(query) || sci.includes(query);
      })
      .sort((a, b) => {
        const an = pick(a, ['name', 'common_name', 'title'], '');
        const bn = pick(b, ['name', 'common_name', 'title'], '');
        return an.localeCompare(bn);
      });

    filtered.forEach(f => {
      const name = pick(f, ['name', 'common_name', 'title'], '');
      const sci = pick(f, ['scientific_name', 'scientific', 'latin_name'], '');
      const desc = pick(f, ['description', 'desc', 'blurb'], '');

      const rawFilename = pick(f, ['image_url', 'image', 'img', 'filename', 'file'], '');
      const filename = rawFilename
        .normalize('NFKD')
        .replace(/[\u0000-\u001F\u007F-\u009F\u00A0]/g, '')
        .replace(/\s+/g, '')
        .trim();

      const illustrated = isIllustrated(f);

      const card = document.createElement('div');
      card.className = 'species-card';
card.classList.remove('locked', 'unlocked');


      // ADDED: lock/unlock logic
      if (MODE === 'catalogue') {
        card.classList.add(illustrated ? 'unlocked' : 'locked');
      } else {
        if (!illustrated) card.classList.add('locked');
        else card.classList.add(discovered ? 'unlocked' : 'locked');
      }

      const img = document.createElement('img');

      if (filename) {
        img.src = `/reefspotter3/images/${filename}`;
      } else {
        img.removeAttribute('src');
      }

      img.alt = name || 'Species image';
      img.onerror = () => (img.style.display = 'none');

      const text = document.createElement('div');
      text.className = 'card-text';

      const nameEl = document.createElement('h2');
      nameEl.textContent = name;

      const sciEl = document.createElement('p');
      sciEl.className = 'scientific-name';
      sciEl.textContent = sci;

      const descEl = document.createElement('p');
      descEl.className = 'description';
      descEl.textContent = desc;

      text.append(nameEl, sciEl, descEl);
      card.append(img, text);
    speciesGrid.appendChild(card);

// CLICK-TO-DISCOVER (TOGGLE, LIVE STATE)
card.addEventListener('click', () => {
  if (MODE !== 'discovery') return;
  if (!illustrated) return;

  if (discoveredSet.has(name)) {
    discoveredSet.delete(name);
  } else {
    discoveredSet.add(name);
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...discoveredSet])
  );

  renderSpecies();
});

const firstLetter = (name[0] || '').toUpperCase();
if (firstLetter && !letterRefs[firstLetter]) letterRefs[firstLetter] = card;
});

updateProgress();
}


  // =========================
  // updateProgress (CHANGED)
  // =========================
  function updateProgress() {
    const total = species.length;
    const illustrated = species.filter(isIllustrated);
    const discoveredIllustrated = illustrated.filter(f =>
      discoveredSet.has(pick(f, ['name'], ''))
    );

    const pct =
      MODE === 'catalogue'
        ? total ? (illustrated.length / total) * 100 : 0
        : illustrated.length
        ? (discoveredIllustrated.length / illustrated.length) * 100
        : 0;

    progressBar.style.width = `${pct}%`;
    progressText.textContent = `${Math.round(pct)}%`;
  }

  // =========================
  // renderAlphabet (UNCHANGED)
  // =========================
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

  // =========================
  // Listeners (UNCHANGED)
  // =========================
  searchInput.addEventListener('input', renderSpecies);
  filterSelect.addEventListener('change', renderSpecies);
document.getElementById('mode-toggle')
  .addEventListener('click', () => {
    setMode(MODE === 'discovery' ? 'catalogue' : 'discovery');
  });


  loadCSV();
});
