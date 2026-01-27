document.addEventListener('DOMContentLoaded', () => {

  /* =========================
     MASCOT RANDOMISER
     ========================= */
  const mascotImages = [
    'horseshoeleatherjacketmale.png',
    'sixbarwrasse.png',
    'weedyseadragon.png'
  ];

  const mascotEl = document.getElementById('mascot-fish');
  if (mascotEl) {
    const pick = mascotImages[Math.floor(Math.random() * mascotImages.length)];
    mascotEl.src = `/reefspotter3/images/${pick}`;
  }

  /* =========================
     PLACEHOLDERS
     ========================= */
  const PLACEHOLDERS = [
    'placeholder1.png',
    'placeholder2.png',
    'placeholder3.png',
    'placeholder4.png',
    'placeholder5.png'
  ];

  const getRandomPlaceholder = () =>
    PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];

  /* =========================
     DOM REFERENCES
     ========================= */
  const speciesGrid = document.getElementById('species-grid');
  const searchInput = document.getElementById('search');
  const filterSelect = document.getElementById('filter');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const alphabetContainer = document.getElementById('alphabet');

  const magnifyOverlay = document.getElementById('magnify-overlay');
  const magnifyImage = magnifyOverlay.querySelector('.magnify-image');
  const magnifyCommon = magnifyOverlay.querySelector('.magnify-common');
  const magnifyScientific = magnifyOverlay.querySelector('.magnify-scientific');
  const magnifyDescription = magnifyOverlay.querySelector('.magnify-description');
  const magnifyLore = magnifyOverlay.querySelector('.magnify-lore');
  const magnifyBg = magnifyOverlay.querySelector('.magnify-bg');
  const magnifyText = magnifyOverlay.querySelector('.magnify-text');

  /* =========================
     DATA + HELPERS
     ========================= */
  let species = [];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const letterRefs = {};

  function pick(obj, keys, fallback = '') {
    for (const k of keys) {
      if (obj[k] && String(obj[k]).trim()) return String(obj[k]).trim();
    }
    return fallback;
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i], next = text[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') { field += '"'; i++; }
        else inQuotes = !inQuotes;
        continue;
      }
      if (c === ',' && !inQuotes) { row.push(field); field = ''; continue; }
      if ((c === '\n' || c === '\r') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        row.push(field);
        if (row.some(cell => cell.trim())) rows.push(row);
        row = []; field = '';
        continue;
      }
      field += c;
    }
    if (field || row.length) {
      row.push(field);
      if (row.some(cell => cell.trim())) rows.push(row);
    }
    return rows;
  }

  /* =========================
     LOAD CSV
     ========================= */
  function loadCSV() {
    fetch('fish.csv')
      .then(r => r.text())
      .then(text => {
        const rows = parseCSV(text.replace(/^\uFEFF/, ''));
        const headers = rows[0].map(h => h.toLowerCase());
        species = rows.slice(1).map(cols => {
          const o = {};
          headers.forEach((h, i) => o[h] = (cols[i] ?? '').trim());
          return o;
        });
        renderSpecies();
        renderAlphabet();
        updateProgress();
      });
  }

  /* =========================
     RENDER SPECIES
     ========================= */
  function renderSpecies() {
    speciesGrid.innerHTML = '';
    Object.keys(letterRefs).forEach(k => delete letterRefs[k]);

    const query = searchInput.value.toLowerCase().trim();
    const filter = filterSelect.value;

    species
      .filter(f => {
        if (filter === 'All Species') return true;
        return pick(f, ['location','category','region','tag']) === filter;
      })
      .filter(f => {
        const n = pick(f,['name','common_name','title']).toLowerCase();
        const s = pick(f,['scientific_name','scientific','latin_name']).toLowerCase();
        return n.includes(query) || s.includes(query);
      })
      .sort((a,b) =>
        pick(a,['name','common_name','title'])
          .localeCompare(pick(b,['name','common_name','title']))
      )
      .forEach(f => {
        const name = pick(f,['name','common_name','title']);
        const sci = pick(f,['scientific_name','scientific','latin_name']);
        const desc = pick(f,['description','desc','blurb']);
        const raw = pick(f,['image_url']);
        const isFunded = raw === 'FUNDED';
        const isIllustrated = raw && !isFunded && raw !== 'NULL';

        const card = document.createElement('div');
        card.className = 'species-card';

        const img = document.createElement('img');
        if (isIllustrated) {
          img.src = `/reefspotter3/images/${raw.replace(/\s+/g,'')}`;
          card.classList.add('unlocked');
        } else if (isFunded) {
          img.src = '/reefspotter3/images/comingsoon.png';
          card.classList.add('funded');
        } else {
          img.src = `/reefspotter3/images/${getRandomPlaceholder()}`;
          card.classList.add('locked');
        }

        if (!isIllustrated) {
          card.addEventListener('click', () => {
            navigator.clipboard.writeText(name);
            window.open('https://ko-fi.com/azzurrobatic','_blank');
          });
        }

        img.alt = name;
        const text = document.createElement('div');
        text.className = 'card-text';

        const h2 = document.createElement('h2'); h2.textContent = name;
        const pSci = document.createElement('p'); pSci.className = 'scientific-name'; pSci.textContent = sci;
        const pDesc = document.createElement('p'); pDesc.className = 'description'; pDesc.textContent = desc;

        text.append(h2,pSci,pDesc);
        card.append(img,text);
        speciesGrid.appendChild(card);

        const l = name[0]?.toUpperCase();
        if (l && !letterRefs[l]) letterRefs[l] = card;
      });

    updateProgress();
  }

  /* =========================
     MAGNIFY MODE — FIXED
     ========================= */
  document.addEventListener('click', e => {
    const card = e.target.closest('.species-card.unlocked');
    if (!card) return;

    const img = card.querySelector('img');
    const rect = img.getBoundingClientRect();

    // reset EVERYTHING
    magnifyImage.style.transition = 'none';
    magnifyImage.style.opacity = '0';
    magnifyText.style.opacity = '0';
    magnifyBg.style.opacity = '0';

    magnifyImage.src = img.src;
    magnifyImage.alt = img.alt;

    magnifyImage.style.top = `${rect.top}px`;
    magnifyImage.style.left = `${rect.left}px`;
    magnifyImage.style.width = `${rect.width}px`;
    magnifyImage.style.height = `${rect.height}px`;
    magnifyImage.style.transform = 'none';

    magnifyOverlay.classList.add('is-visible');

    magnifyImage.getBoundingClientRect(); // force layout
    magnifyImage.style.transition = '';

    requestAnimationFrame(() => {
      const size = Math.min(window.innerWidth * 0.62, 560);
      magnifyBg.style.opacity = '1';
      magnifyImage.style.opacity = '1';
      magnifyImage.style.top = `${window.innerHeight / 2}px`;
      magnifyImage.style.left = `${window.innerWidth / 2}px`;
      magnifyImage.style.width = `${size}px`;
      magnifyImage.style.height = `${size}px`;
      magnifyImage.style.transform = 'translate(-50%, -50%)';
    });

    setTimeout(() => {
      magnifyText.style.opacity = '1';
    }, 220);
  });

  magnifyOverlay.addEventListener('click', () => {
    magnifyOverlay.classList.remove('is-visible');
  });

  /* =========================
     INIT
     ========================= */
  searchInput.addEventListener('input', renderSpecies);
  filterSelect.addEventListener('change', renderSpecies);
  loadCSV();
});
