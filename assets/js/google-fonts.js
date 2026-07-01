import { esc } from './utils.js';

// Google Fonts picker. Searches a curated list of popular families (no API key,
// no rate limits) and loads each family's stylesheet on demand from the Google
// Fonts CSS2 endpoint so previews — and the canvas — render in the real font.
//
// A design tab pairs naturally with Flutter's `google_fonts` package: a family
// chosen here maps to `GoogleFonts.<family>()` when code export lands.

// Curated set of popular Google Fonts, tagged by category. Kept as a static list
// on purpose: the Google Fonts *metadata* API needs a key, but loading any family
// via the CSS2 endpoint does not — so we ship the names and fetch on demand.
export const GOOGLE_FONTS = [
  // Sans-serif
  ['Inter', 'sans'], ['Roboto', 'sans'], ['Open Sans', 'sans'], ['Lato', 'sans'],
  ['Montserrat', 'sans'], ['Poppins', 'sans'], ['Nunito', 'sans'], ['Nunito Sans', 'sans'],
  ['Work Sans', 'sans'], ['Rubik', 'sans'], ['Mulish', 'sans'], ['Manrope', 'sans'],
  ['DM Sans', 'sans'], ['Karla', 'sans'], ['Source Sans 3', 'sans'], ['Noto Sans', 'sans'],
  ['PT Sans', 'sans'], ['Barlow', 'sans'], ['Kanit', 'sans'], ['Heebo', 'sans'],
  ['Figtree', 'sans'], ['Onest', 'sans'], ['Plus Jakarta Sans', 'sans'], ['Space Grotesk', 'sans'],
  ['Outfit', 'sans'], ['Sora', 'sans'], ['Lexend', 'sans'], ['Albert Sans', 'sans'],
  ['Hanken Grotesk', 'sans'], ['Instrument Sans', 'sans'], ['Schibsted Grotesk', 'sans'],
  ['Cabin', 'sans'], ['Josefin Sans', 'sans'], ['Quicksand', 'sans'], ['Titillium Web', 'sans'],
  ['Fira Sans', 'sans'], ['Oxygen', 'sans'], ['Ubuntu', 'sans'], ['Assistant', 'sans'],
  ['IBM Plex Sans', 'sans'],
  ['Overpass', 'sans'], ['Red Hat Display', 'sans'], ['Urbanist', 'sans'], ['Epilogue', 'sans'],
  ['Be Vietnam Pro', 'sans'], ['Chivo', 'sans'], ['Signika', 'sans'], ['Mukta', 'sans'],

  // Serif
  ['Merriweather', 'serif'], ['Playfair Display', 'serif'], ['Lora', 'serif'],
  ['PT Serif', 'serif'], ['Noto Serif', 'serif'], ['Source Serif 4', 'serif'],
  ['Roboto Slab', 'serif'], ['Bitter', 'serif'], ['Crimson Text', 'serif'],
  ['Libre Baskerville', 'serif'], ['EB Garamond', 'serif'], ['Cormorant Garamond', 'serif'],
  ['Spectral', 'serif'], ['Zilla Slab', 'serif'], ['Domine', 'serif'], ['Frank Ruhl Libre', 'serif'],
  ['Newsreader', 'serif'], ['Fraunces', 'serif'], ['DM Serif Display', 'serif'],
  ['Petrona', 'serif'], ['Cardo', 'serif'], ['Vollkorn', 'serif'], ['Alegreya', 'serif'],
  ['Instrument Serif', 'serif'], ['Bodoni Moda', 'serif'],

  // Display
  ['Oswald', 'display'], ['Bebas Neue', 'display'], ['Anton', 'display'],
  ['Archivo Black', 'display'], ['Righteous', 'display'], ['Alfa Slab One', 'display'],
  ['Abril Fatface', 'display'], ['Fjalla One', 'display'], ['Teko', 'display'],
  ['Passion One', 'display'], ['Bungee', 'display'], ['Staatliches', 'display'],
  ['Unbounded', 'display'], ['Bricolage Grotesque', 'display'], ['Syne', 'display'],
  ['Comfortaa', 'display'], ['Chakra Petch', 'display'], ['Orbitron', 'display'],
  ['Russo One', 'display'], ['Monoton', 'display'],

  // Handwriting / script
  ['Dancing Script', 'hand'], ['Pacifico', 'hand'], ['Caveat', 'hand'],
  ['Satisfy', 'hand'], ['Great Vibes', 'hand'], ['Sacramento', 'hand'],
  ['Shadows Into Light', 'hand'], ['Permanent Marker', 'hand'], ['Kalam', 'hand'],
  ['Indie Flower', 'hand'], ['Lobster', 'hand'], ['Cookie', 'hand'],
  ['Homemade Apple', 'hand'], ['Gochi Hand', 'hand'], ['Patrick Hand', 'hand'],

  // Monospace
  ['JetBrains Mono', 'mono'], ['Fira Code', 'mono'], ['Source Code Pro', 'mono'],
  ['Roboto Mono', 'mono'], ['IBM Plex Mono', 'mono'], ['Space Mono', 'mono'],
  ['Inconsolata', 'mono'], ['DM Mono', 'mono'], ['Ubuntu Mono', 'mono'],
  ['Overpass Mono', 'mono'], ['Courier Prime', 'mono'], ['Martian Mono', 'mono'],
];

const CATS = [
  ['all', 'All'], ['sans', 'Sans'], ['serif', 'Serif'],
  ['display', 'Display'], ['hand', 'Handwriting'], ['mono', 'Mono'],
];
const CAT_LABELS = { sans: 'Sans', serif: 'Serif', display: 'Display', hand: 'Script', mono: 'Mono' };
const SAMPLE = 'The quick brown fox jumps over';

// System / generic families never fetch — they're locally available.
const SYSTEM = new Set([
  'system-ui', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New',
  'sans-serif', 'serif', 'monospace',
]);

const loaded = new Set();

// Inject the Google Fonts stylesheet for one family (idempotent). Requested
// without a weight axis so the request never 400s on a family that lacks a
// specific cut — the browser synthesises heavier/lighter weights for previews.
export function ensureFontLoaded(family) {
  if (!family || loaded.has(family) || SYSTEM.has(family)) return;
  loaded.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap`;
  document.head.appendChild(link);
}

// Load a batch of families in a single request (used for the results grid).
function ensureBatch(families) {
  const fresh = families.filter(f => f && !loaded.has(f) && !SYSTEM.has(f));
  if (!fresh.length) return;
  fresh.forEach(f => loaded.add(f));
  const q = fresh.map(f => `family=${encodeURIComponent(f)}`).join('&');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${q}&display=swap`;
  document.head.appendChild(link);
}

const cssFamily = (f) => (/\s/.test(f) ? `'${f}'` : f);

let modal, chipsEl, searchInput, results, closeBtn;
let activeCat = 'all';
let onPick = null;       // callback set when the modal is opened
let debounce;

function filtered() {
  const q = searchInput.value.trim().toLowerCase();
  return GOOGLE_FONTS.filter(([name, cat]) =>
    (activeCat === 'all' || cat === activeCat) &&
    (!q || name.toLowerCase().includes(q)));
}

function renderResults() {
  const list = filtered();
  if (!list.length) {
    results.innerHTML = `<div class="icon-msg">No fonts match — try another name or category.</div>`;
    return;
  }
  ensureBatch(list.map(([name]) => name));
  results.innerHTML = list.map(([name, cat]) =>
    `<button class="font-tile" data-font="${esc(name)}" style="font-family:${cssFamily(name)}">
       <span class="font-info">
         <span class="font-specimen">${esc(name)}</span>
         <span class="font-sample">${SAMPLE}</span>
       </span>
       <span class="font-cat">${esc(CAT_LABELS[cat] || cat)}</span>
     </button>`).join('');
}

function open(current, cb) {
  onPick = cb;
  activeCat = 'all';
  chipsEl.querySelectorAll('.icon-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === 'all'));
  modal.hidden = false;
  searchInput.value = '';
  renderResults();
  // Highlight the current family if it's in view.
  if (current) {
    const cur = results.querySelector(`.font-tile[data-font="${CSS.escape(current)}"]`);
    if (cur) { cur.classList.add('current'); cur.scrollIntoView({ block: 'center' }); }
  }
  searchInput.focus();
}

function close() { modal.hidden = true; onPick = null; }

export function initFontPicker() {
  modal = document.getElementById('font-modal');
  if (!modal) return; // not on this page
  chipsEl = document.getElementById('font-cats');
  searchInput = document.getElementById('font-search');
  results = document.getElementById('font-results');
  closeBtn = document.getElementById('font-close');

  chipsEl.innerHTML = CATS.map(([v, l]) =>
    `<button class="icon-chip ${v === 'all' ? 'active' : ''}" data-cat="${v}">${l}</button>`).join('');

  chipsEl.addEventListener('click', e => {
    const chip = e.target.closest('.icon-chip');
    if (!chip) return;
    activeCat = chip.dataset.cat;
    chipsEl.querySelectorAll('.icon-chip').forEach(c => c.classList.toggle('active', c === chip));
    renderResults();
  });

  searchInput.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(renderResults, 120); });

  results.addEventListener('click', e => {
    const tile = e.target.closest('.font-tile');
    if (!tile) return;
    const family = tile.dataset.font;
    ensureFontLoaded(family);
    const cb = onPick;
    close();
    if (cb) cb(family);
  });

  // Opened from the Typography panel's family control.
  document.addEventListener('font:open', e => open(e.detail.current, e.detail.onPick));

  closeBtn?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) { e.stopPropagation(); close(); } });
}
