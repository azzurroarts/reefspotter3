// reefspotter3 script.js

let species = []
let unlocked = []
let filter = 'All Species'
let searchTerm = ''
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const letterRefs = {}
let activeLetter = null

// Fetch CSV and parse
fetch('fish.csv')
  .then((res) => res.text())
  .then((text) => {
    const rows = text.split('\n').filter(r => r.trim() !== '')
    const headers = rows[0].split(',')
    species = rows.slice(1).map((row) => {
      const values = row.split(',')
      const obj = {}
      headers.forEach((h, i) => obj[h] = values[i])
      return obj
    })
    renderSpecies()
    renderAlphabet()
  })

// Filtered species
function getFilteredSpecies() {
  return species
    .filter((fish) => {
      if (filter === 'All Species') return true
      if (!fish.location) return true
      return fish.location === filter
    })
    .filter((fish) => {
      const term = searchTerm.toLowerCase()
      return (
        fish.name.toLowerCase().includes(term) ||
        (fish.scientific_name?.toLowerCase().includes(term)) ||
        (fish.description?.toLowerCase().includes(term))
      )
    })
}

// Render species cards
function renderSpecies() {
  const container = document.querySelector('.species-grid')
  container.innerHTML = ''

  const filtered = getFilteredSpecies()
  filtered.sort((a, b) => a.name.localeCompare(b.name))

  filtered.forEach((fish, idx, arr) => {
    const firstLetter = fish.name.charAt(0).toUpperCase()
    const prevLetter = idx > 0 ? arr[idx - 1].name.charAt(0).toUpperCase() : null

    const cardWrapper = document.createElement('div')
    if (firstLetter !== prevLetter) letterRefs[firstLetter] = cardWrapper

    const card = document.createElement('div')
    card.className = 'species-card ' + (unlocked.includes(fish.name) ? 'unlocked' : 'locked')

    const img = document.createElement('img')
    img.src = fish.image_url
    img.alt = fish.name
    card.appendChild(img)

    const h2 = document.createElement('h2')
    h2.innerHTML = highlightMatch(fish.name, searchTerm)
    h2.className = 'font-bold text-center'
    card.appendChild(h2)

    if (fish.scientific_name) {
      const sci = document.createElement('p')
      sci.className = 'text-sm italic text-center'
      sci.textContent = fish.scientific_name
      card.appendChild(sci)
    }

    if (fish.description) {
      const desc = document.createElement('p')
      desc.className = 'text-xs text-center mt-1'
      desc.textContent = fish.description
      card.appendChild(desc)
    }

    card.addEventListener('click', (e) => {
      e.preventDefault()
      if (unlocked.includes(fish.name)) {
        unlocked = unlocked.filter((name) => name !== fish.name)
        card.classList.remove('unlocked')
        card.classList.add('locked')
      } else {
        unlocked.push(fish.name)
        card.classList.remove('locked')
        card.classList.add('unlocked')
      }
      updateProgress()
    })

    cardWrapper.appendChild(card)
    container.appendChild(cardWrapper)
  })

  updateProgress()
}

// Highlight search matches
function highlightMatch(text, query) {
  if (!query) return text
  const regex = new RegExp(`(${query})`, 'gi')
  return text.split(regex).map((part) =>
    regex.test(part) ? `<mark class="bg-yellow-300 text-black rounded px-0.5">${part}</mark>` : part
  ).join('')
}

// Update progress bar
function updateProgress() {
  const filtered = getFilteredSpecies()
  const percent = filtered.length ? Math.round((unlocked.length / filtered.length) * 100) : 0
  const bar = document.querySelector('.progress-bar')
  bar.style.width = percent + '%'
  const label = bar.parentElement.querySelector('div')
  if (label) label.textContent = percent + '%'
}

// Search input
const searchInput = document.querySelector('input[type="text"]')
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value
    renderSpecies()
  })
}

// Alphabet sidebar
function renderAlphabet() {
  const container = document.querySelector('.vertical-alphabet')
  container.innerHTML = ''
  alphabet.forEach((letter) => {
    const span = document.createElement('span')
    span.textContent = letter
    span.className = 'alphabet-letter'
    span.addEventListener('click', () => scrollToLetter(letter))
    container.appendChild(span)
  })
}

// Scroll to letter
function scrollToLetter(letter) {
  const ref = letterRefs[letter]
  if (ref) ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Update active letter on scroll
window.addEventListener('scroll', () => {
  let closest = null
  let closestOffset = Infinity
  Object.entries(letterRefs).forEach(([letter, el]) => {
    const offset = Math.abs(el.getBoundingClientRect().top - 120)
    if (offset < closestOffset) {
      closestOffset = offset
      closest = letter
    }
  })
  activeLetter = closest
  document.querySelectorAll('.alphabet-letter').forEach((el) => {
    el.classList.toggle('active', el.textContent === activeLetter)
  })
})
