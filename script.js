let species = []
let unlocked = []

const speciesGrid = document.getElementById('species-grid')
const searchInput = document.getElementById('search')
const filterSelect = document.getElementById('filter')
const progressBar = document.getElementById('progress-bar')
const progressText = document.getElementById('progress-text')
const alphabetDiv = document.getElementById('alphabet')
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const letterRefs = {}

fetch('fish.csv')
  .then(res => res.text())
  .then(text => {
    const rows = text.split('\n').filter(Boolean)
    const headers = rows[0].split(',')
    species = rows.slice(1).map(row => {
      const values = row.split(',')
      let obj = {}
      headers.forEach((h, i) => obj[h.trim()] = values[i].trim())
      return obj
    })
    renderSpecies()
    renderAlphabet()
  })

function toggleUnlock(id) {
  if (unlocked.includes(id)) {
    unlocked = unlocked.filter(x => x !== id)
  } else {
    unlocked.push(id)
  }
  renderSpecies()
}

function highlight(text) {
  const term = searchInput.value
  if (!term) return text
  const regex = new RegExp(`(${term})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

function renderSpecies() {
  const filter = filterSelect.value
  const term = searchInput.value.toLowerCase()
  const filtered = species
    .filter(f => filter === 'All Species' || f.location === filter)
    .filter(f => f.name.toLowerCase().includes(term) ||
                 f.scientific_name.toLowerCase().includes(term) ||
                 f.description.toLowerCase().includes(term))

  speciesGrid.innerHTML = ''
  filtered.sort((a,b)=>a.name.localeCompare(b.name)).forEach(fish => {
    const firstLetter = fish.name.charAt(0).toUpperCase()
    if (!letterRefs[firstLetter]) letterRefs[firstLetter] = null

    const div = document.createElement('div')
    div.innerHTML = `
      <div class="species-card ${unlocked.includes(fish.id)?'unlocked':'locked'}">
        <img src="${fish.image_url}" alt="${fish.name}">
        <h2>${highlight(fish.name)}</h2>
        <p><i>${fish.scientific_name}</i></p>
        <p>${fish.description}</p>
      </div>
    `
    div.querySelector('.species-card').addEventListener('click',()=>toggleUnlock(fish.id))
    speciesGrid.appendChild(div)
  })

  // Progress
  const percent = filtered.length ? Math.round((unlocked.length/filtered.length)*100) : 0
  progressBar.style.width = percent + '%'
  progressText.innerText = percent + '%'
}

searchInput.addEventListener('input', renderSpecies)
filterSelect.addEventListener('change', renderSpecies)

function renderAlphabet() {
  alphabetDiv.innerHTML = ''
  letters.forEach(letter => {
    const span = document.createElement('span')
    span.innerText = letter
    span.className = 'alphabet-letter'
    span.onclick = () => scrollToLetter(letter)
    alphabetDiv.appendChild(span)
  })
}

function scrollToLetter(letter) {
  const el = [...speciesGrid.children].find(div => div.querySelector('h2').innerText.charAt(0).toUpperCase() === letter)
  if (el) el.scrollIntoView({behavior:'smooth', block:'start'})
}
