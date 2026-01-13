document.addEventListener('DOMContentLoaded', () => {
  const speciesGrid = document.getElementById('species-grid');
  const searchInput = document.getElementById('search');
  const filterSelect = document.getElementById('filter');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const alphabetContainer = document.getElementById('alphabet');

  let species = [];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const letterRefs = {};

  // Robust CSV parser: quoted fields, commas in quotes, escaped quotes ("")
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

  function normalizeHeader(h) {
    return (h || '')
      .replace(/^\uFEFF/, '') // strip BOM if present
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  // Pick the first existing key from a list of possibilities
  function pick(obj, keys, fallback = '') {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
        return String(obj[k]).trim();
      }
    }
    return fallback;
  }

  function loadCSV() {
  fetch('fish.csv')
    .then(res => {
      if (!res.ok) throw new Error(`fish.csv fetch failed (${res.status})`);
      return res.text();
    })
    .then(text => {
      text = text.replace(/^\uFEFF/, ''); // strip BOM

      const rows = parseCSV(text);

      // 🔴 DEBUG OUTPUT ON PAGE
      speciesGrid.innerHTML = `
        <div style="padding:1rem;border:2px solid #000;border-radius:12px;margin:1rem;">
          <strong>DEBUG:</strong><br>
          Rows parsed: ${rows.length}<br>
          First row (headers): ${rows[0] ? rows[0].join(' | ') : 'NONE'}
        </div>
      `;

      if (!rows.length) throw new Error('No rows parsed from CSV');

      const headers = rows[0].map(h =>
        h.replace(/^\uFEFF/, '').trim().toLowerCase()
      );

      species = rows.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = (cols[i] ?? '').trim();
        });
        return obj;
      });

      // 🔴 MORE DEBUG
      speciesGrid.innerHTML += `
        <div style="padding:1rem;border:2px dashed #000;border-radius:12px;margin:1rem;">
          Species objects created: ${species.length}<br>
          First species keys: ${species[0] ? Object.keys(species[0]).join(', ') : 'NONE'}
        </div>
      `;

      renderSpecies();
      renderAlphabet();
      updateProgress();
    })
    .catch(err => {
      speciesGrid.innerHTML = `
        <div style="padding:1rem;border:2px solid red;border-radius:12px;margin:1rem;">
          CSV ERROR: ${err.message}
        </div>
      `;
    });
}


  function renderSpecies() {
    speciesGrid.innerHTML = '';
    for (const k of Object.keys(letterRefs)) delete letterRefs[k];

    const query = (searchInput.value || '').trim().toLowerCase();
    const filter = filterSelect.value; // "All Species" or GBR/GSR/etc

    const filtered = species
      .filter(f => {
        // Flexible location field names
        const loc = pick(f, ['location', 'category', 'region', 'tag'], '');
        if (filter === 'All Species') return true;
        return loc === filter;
      })
      .filter(f => {
        const name = pick(f, ['name', 'common_name', 'title'], '').toLowerCase();
        const sci  = pick(f, ['scientific_name', 'scientific', 'latin_name'], '').toLowerCase();
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

      // image filename (not URL)
      const rawFilename = pick(f, ['image_url', 'image', 'img', 'filename', 'file'], '');

const filename = rawFilename
  .normalize('NFKD')
  .replace(/[\u0000-\u001F\u007F-\u009F\u00A0]/g, '')
  .replace(/\s+/g, '')
  .trim();



      const card = document.createElement('div');
      card.className = 'species-card unlocked';

      const img = document.createElement('img');

      if (filename) {
        img.src = `/reefspotter/images/${encodeURIComponent(filename)}`;
      } else {
        // If missing, point to placeholder so the card still shows
        img.src = '/reefspotter/images/placeholder.png';
      }

      img.alt = name || 'Species image';
      img.onerror = () => {
        img.src = '/reefspotter/images/placeholder.png';
        img.alt = `${name || 'Species'} (image missing)`;
      };

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

      const firstLetter = (name[0] || '').toUpperCase();
      if (firstLetter && !letterRefs[firstLetter]) letterRefs[firstLetter] = card;
    });

    updateProgress(filtered.length);
  }

  function updateProgress(visibleCount = species.length) {
    const total = species.length || 0;
    const pct = total ? Math.round((visibleCount / total) * 100) : 0;
    progressBar.style.width = `${pct}%`;
    progressText.textContent = `${pct}%`;
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

  loadCSV();
});
