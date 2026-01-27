document.addEventListener('DOMContentLoaded', () => {
  /*scroll state locker*/
  let scrollY = 0;

function lockScroll() {
  scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
}

function unlockScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, scrollY);
}

 /*MASCOT*/
  // ---- Mascot randomiser ----
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

  /*DOMINANT COLOUR EXTRACTOR */
function extractDominantColour(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const size = 40;
  canvas.width = size;
  canvas.height = size;

  ctx.drawImage(img, 0, 0, size, size);

  const data = ctx.getImageData(0, 0, size, size).data;

  let r = 0, g = 0, b = 0, count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const rr = data[i];
    const gg = data[i + 1];
    const bb = data[i + 2];

    const max = Math.max(rr, gg, bb);
    const min = Math.min(rr, gg, bb);
    const saturation = max - min;

    /* ---- FILTERS ---- */

    // ignore near-black
    if (max < 45) continue;

    // ignore near-white
    if (min > 215) continue;

    // ignore greys / low saturation
    if (saturation < 30) continue;

    // ignore dark browns / muddy oranges
    // (red dominant, low blue, mid green)
    if (
      rr > gg &&
      gg > bb &&
      rr - bb > 60 &&
      max < 160
    ) continue;

    r += rr;
    g += gg;
    b += bb;
    count++;
  }

  if (!count) {
    // fallback: soft neutral glow
    return 'rgba(255,255,255,0.9)';
  }

  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);

  return `rgb(${r}, ${g}, ${b})`;
}

  function boostColour(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).map(Number);

  // convert to HSL
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
      case gN: h = (bN - rN) / d + 2; break;
      case bN: h = (rN - gN) / d + 4; break;
    }
    h /= 6;
  }

  // BOOST IT (this is the magic)
  s = Math.min(1, s * 1.35);   // more saturation
  l = Math.min(1, l + 0.18);   // lighter

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}


  const PLACEHOLDERS = [
  'placeholder1.png',
  'placeholder2.png',
  'placeholder3.png',
  'placeholder4.png',
  'placeholder5.png'
];

function getRandomPlaceholder() {
  return PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];
}

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

        // 🔴 DEBUG OUTPUT ON PAGE (optional; remove later)
        speciesGrid.innerHTML = `
          <div style="padding:1rem;border:2px solid #000;border-radius:12px;margin:1rem;">
            <strong>DEBUG:</strong><br>
            Rows parsed: ${rows.length}<br>
            First row (headers): ${rows[0] ? rows[0].join(' | ') : 'NONE'}
          </div>
        `;

        if (!rows.length) throw new Error('No rows parsed from CSV');

        const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
        species = rows.slice(1).map(cols => {
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = (cols[i] ?? '').trim();
          });
          return obj;
        });

        // 🔴 MORE DEBUG (optional; remove later)
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
    // Clear grid (this will remove the debug boxes once it renders cards)
    speciesGrid.innerHTML = '';
    for (const k of Object.keys(letterRefs)) delete letterRefs[k];

    const query = (searchInput.value || '').trim().toLowerCase();
    const filter = filterSelect.value; // "All Species" or GBR/GSR/etc

    const filtered = species
      .filter(f => {
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

      // image filename (not URL)
const rawFilename = pick(f, ['image_url'], '');

const raw = (rawFilename || '').trim();

const isFunded = raw === 'FUNDED';

const isIllustrated =
  raw &&
  raw !== 'UNDEFINED' &&
  raw !== 'NULL' &&
  !isFunded;

const filename = isIllustrated
  ? raw
      .normalize('NFKD')
      .replace(/[\u0000-\u001F\u007F-\u009F\u00A0]/g, '')
      .replace(/\s+/g, '')
      .trim()
  : '';


      const card = document.createElement('div');
      card.className = 'species-card';


  

          const img = document.createElement('img');

      /*IMAGE SWITCH*/
      if (isIllustrated) {
  img.src = `/reefspotter3/images/${filename}`;
  card.classList.add('unlocked');
   
        // 🎨 dominant colour → boosted → card hover tint
img.addEventListener('load', () => {
  try {
    const base = extractDominantColour(img);
    const boosted = boostColour(base);
    card.style.setProperty('--card-tint', boosted);
  } catch (e) {
    // do nothing if colour extraction fails
  }
  });


} else if (isFunded) {
  img.src = `/reefspotter3/images/comingsoon.png`;
  card.classList.add('funded');

} else {
  img.src = `/reefspotter3/images/${getRandomPlaceholder()}`;
  card.classList.add('locked');
}

// 👉 CLICK TO FUND (ONLY FOR LOCKED CARDS)
if (!isIllustrated) {
  card.addEventListener('click', () => {
    navigator.clipboard.writeText(name);
    window.open('https://ko-fi.com/azzurrobatic', '_blank');
  });
}



      img.alt = name || 'Species image';

      
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

      /*FUNDER TEXT ON CARD*/
      const funder = pick(f, ['funder'], '');

if (funder) {
  const funderEl = document.createElement('p');
  funderEl.className = 'funder';
  funderEl.textContent = funder;
  text.appendChild(funderEl);
}

      card.append(img, text);
      speciesGrid.appendChild(card);
// 🅰️ alphabet colour echo on hover (unlocked only)
if (isIllustrated) {
  card.addEventListener('mouseenter', () => {
    const letter = name[0]?.toUpperCase();
    const alphaEl = document.querySelector(
      `.alphabet-letter.active, .alphabet-letter:nth-child(${alphabet.indexOf(letter) + 1})`
    );

    if (alphaEl) {
      const tint = card.style.getPropertyValue('--card-tint');
      if (tint) {
        document.documentElement.style.setProperty('--alpha-tint', tint);
      }
    }
  });

  card.addEventListener('mouseleave', () => {
    document.documentElement.style.removeProperty('--alpha-tint');
  });
}

      const firstLetter = (name[0] || '').toUpperCase();
      if (firstLetter && !letterRefs[firstLetter]) letterRefs[firstLetter] = card;
    });

    updateProgress();
        setupPlaceholderAnimation();
  }
  /* placeholder animations*/
  function setupPlaceholderAnimation() {
  const placeholders = document.querySelectorAll('.species-card.locked img');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const img = entry.target;

        if (entry.isIntersecting) {
          // Start gentle periodic wiggle
          if (!img._wiggleInterval) {
            img.classList.add('wiggle');

            img._wiggleInterval = setInterval(() => {
              img.classList.remove('wiggle');
              void img.offsetWidth; // force reflow
              img.classList.add('wiggle');
            }, 4500); // every ~4.5s
          }
        } else {
          // Stop wiggle when offscreen
          if (img._wiggleInterval) {
            clearInterval(img._wiggleInterval);
            img._wiggleInterval = null;
          }
          img.classList.remove('wiggle');
        }
      });
    },
    {
      threshold: 0.6
    }
  );

  placeholders.forEach(img => observer.observe(img));
}


  function updateProgress() {
  const total = species.length || 0;

  const illustratedCount = species.filter(f => {
    const raw = pick(f, ['image_url', 'image', 'img', 'filename'], '');
    const v = raw.toLowerCase();
    return raw && v !== 'undefined' && v !== 'null';
  }).length;

  const pct = total
    ? Math.round((illustratedCount / total) * 100)
    : 0;

  progressBar.style.width = `${pct}%`;
  progressText.textContent = `${pct}% illustrated`;
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

 let activeLetter = null;

function updateActiveLetter() {
  const cards = document.querySelectorAll('.species-card');
  let nextLetter = activeLetter;

  for (const card of cards) {
    const rect = card.getBoundingClientRect();

    // Use a deeper trigger point to avoid jitter
    if (rect.top < window.innerHeight * 0.4) {
      const title = card.querySelector('h2');
      if (title) {
        nextLetter = title.textContent[0]?.toUpperCase();
      }
    } else {
      break;
    }
  }

  if (nextLetter !== activeLetter) {
    activeLetter = nextLetter;

    document.querySelectorAll('.alphabet-letter').forEach(el => {
      el.classList.toggle('active', el.textContent === activeLetter);
    });
  }
}

window.addEventListener('scroll', updateActiveLetter, { passive: true });


  searchInput.addEventListener('input', renderSpecies);
  filterSelect.addEventListener('change', renderSpecies);

/* =========================
   MAGNIFY MODE — STEP 2
   Event delegation (correct)
   ========================= */

const magnifyOverlay = document.getElementById("magnify-overlay");
const magnifyImage = magnifyOverlay.querySelector(".magnify-image");
const magnifyCommon = magnifyOverlay.querySelector(".magnify-common");
const magnifyScientific = magnifyOverlay.querySelector(".magnify-scientific");
const magnifyDescription = magnifyOverlay.querySelector(".magnify-description");
const magnifyLore = magnifyOverlay.querySelector(".magnify-lore");

// Handle clicks on unlocked cards (even if created later)
document.addEventListener("click", (e) => {
  const card = e.target.closest(".species-card.unlocked");
  if (!card) return;

  const img = card.querySelector("img");
  const common = card.querySelector("h2");
  const scientific = card.querySelector(".scientific-name");
  const description = card.querySelector(".description");

  // Populate overlay
  // --- HARD RESET IMAGE TO KILL GHOST ---
magnifyImage.src = "";
magnifyImage.removeAttribute("src");
magnifyImage.style.opacity = "0";
magnifyImage.style.transform = "none";

// force browser to forget previous bitmap
magnifyImage.getBoundingClientRect();

// NOW apply new image
magnifyImage.src = img?.src || "";
magnifyImage.alt = img?.alt || "";


  magnifyCommon.textContent = common?.textContent || "";
  magnifyScientific.textContent = scientific?.textContent || "";
  magnifyDescription.textContent = description?.textContent || "";
  magnifyLore.textContent = ""; // later CSV column

  // Show overlay instantly
    // --- ZOOM FROM CARD → CENTRE (no Step 3 precision needed) ---

  // Reset any old state so you don't see the previous fish flash
  
  magnifyImage.style.transition = 'none';
  magnifyImage.style.opacity = '0';

  // Start position = the clicked card image
  magnifyImage.onload = () => {
  const rect = img.getBoundingClientRect();
    // store origin for close animation
magnifyOverlay._originRect = rect;


  magnifyImage.style.top = `${rect.top}px`;
  magnifyImage.style.left = `${rect.left}px`;
  magnifyImage.style.width = `${rect.width}px`;
  magnifyImage.style.height = `${rect.height}px`;
  magnifyImage.style.transform = 'none';

    
  // Show overlay AFTER positioning
  const imageWrap = magnifyOverlay.querySelector('.magnify-image-wrap');

// hard reset shimmer + glitter so no previous state leaks
imageWrap.classList.add('reset-visuals');

// force browser to acknowledge reset
imageWrap.getBoundingClientRect();

// remove reset so animations restart clean
imageWrap.classList.remove('reset-visuals');

  magnifyOverlay.classList.add("is-visible");
    lockScroll();

  magnifyOverlay.setAttribute("aria-hidden", "false");
  // ---- GLITTER EMITTER ----
const glitterLayer = magnifyOverlay.querySelector('.magnify-glitter-layer');
glitterLayer.innerHTML = '';

  // extract dominant species colour for glitter
const dominantColour = extractDominantColour(img);
glitterLayer.style.setProperty('--sparkle-colour', dominantColour);
  // apply dominant colour to background atmosphere
const bg = magnifyOverlay.querySelector('.magnify-bg');

// soften + add alpha so it never overwhelms
bg.style.setProperty(
  '--bg-colour',
  dominantColour.replace('rgb', 'rgba').replace(')', ', 0.65)')
);




let glitterActive = true;
magnifyOverlay._glitterActive = true;

function spawnSparkle() {
  if (!magnifyOverlay._glitterActive) return;

  const s = document.createElement('span');
  // mix white glitter with species colour
const useWhite = Math.random() < 0.35; // 35% white sparkles

if (useWhite) {
  s.style.background = 'rgba(255,255,255,0.95)';
} else {
  s.style.background = 'var(--sparkle-colour)';
}

  // subtle variance per sparkle
const size = 2 + Math.random() * 3; // 2–5px
const brightness = 0.7 + Math.random() * 0.6; // glow variance

s.style.width = `${size}px`;
s.style.height = `${size}px`;
s.style.opacity = brightness;
  
s.style.filter = `blur(${Math.random() * 0.6}px)`;


  const angle = Math.random() * Math.PI * 2;
  const distance = 160 + Math.random() * 220;

  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;

  s.style.left = '50%';
  s.style.top = '50%';
  s.style.setProperty('--dx', `${dx}px`);
  s.style.setProperty('--dy', `${dy}px`);

  glitterLayer.appendChild(s);

  s.addEventListener('animationend', () => s.remove());
}

// steady emission rate
magnifyOverlay._glitterInterval = setInterval(spawnSparkle, 20);

  // Explicitly reset bg + text every time (inline styles override CSS)

const text = magnifyOverlay.querySelector('.magnify-text');

bg.style.opacity = '1';
text.style.opacity = '1';


  // Force browser to commit the start state
  magnifyImage.getBoundingClientRect();

  // Re-enable transitions so it can animate
  magnifyImage.style.transition = '';

  // Animate to centre with numeric target (no 'min()' CSS — browsers won't animate that)
  requestAnimationFrame(() => {
    const size = Math.min(window.innerWidth * 0.62, 560);

    magnifyImage.style.opacity = '1';
    magnifyImage.style.top = `${window.innerHeight / 2}px`;
    magnifyImage.style.left = `${window.innerWidth / 2}px`;
    magnifyImage.style.width = `${size}px`;
    magnifyImage.style.height = `${size}px`;
    magnifyImage.style.transform = 'translate(-50%, -50%)';
  });
  };

  // --- END ZOOM ---
});

// Click anywhere on overlay to close
magnifyOverlay.addEventListener("click", () => {
  // stop glitter
  magnifyOverlay._glitterActive = false;
  clearInterval(magnifyOverlay._glitterInterval);

  const bg = magnifyOverlay.querySelector('.magnify-bg');
  const text = magnifyOverlay.querySelector('.magnify-text');
  const rect = magnifyOverlay._originRect;

  // fade text + background first
  text.style.opacity = '0';
  bg.style.opacity = '0';

  // animate image BACK to card
  if (rect) {
    magnifyImage.style.opacity = '1';
    magnifyImage.style.transform = 'none';
    magnifyImage.style.top = `${rect.top}px`;
    magnifyImage.style.left = `${rect.left}px`;
    magnifyImage.style.width = `${rect.width}px`;
    magnifyImage.style.height = `${rect.height}px`;
  } else {
    // fallback: gentle fade
    magnifyImage.style.opacity = '0';
  }

  // after animation completes, fully hide + hard reset
  setTimeout(() => {
    magnifyOverlay.classList.remove("is-visible");
    magnifyOverlay.setAttribute("aria-hidden", "true");
    unlockScroll();


    // HARD reset to prevent ghosting
    magnifyImage.src = "";
    magnifyImage.style.opacity = '0';
    magnifyOverlay._originRect = null;
    bg.style.removeProperty('--bg-colour');
  }, 620); // must match image transition duration
});





  loadCSV();
});


