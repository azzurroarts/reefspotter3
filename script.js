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
        if (!rows.length) throw new Error('No rows parsed from CSV');

        const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
        species = rows.slice(1).map(cols => {
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = (cols[i] ?? '').trim();
          });
          return obj;
        });

        renderSpecies();
        renderAlphabet();
        updateProgress();
      })
      .catch(err => {
        speciesGrid.innerHTML = `
          <div style="paddin
