import { state, getNode, makeNode } from './state.js';
import { canvasToWorld, canAcceptChild, isSingleChild } from './nodes.js';
import { saveHistory } from './history.js';
import { render } from './render.js';
import { canvasWrap, esc, showToast } from './utils.js';

// Icon picker — searches the free Iconify API (https://iconify.design) and drops
// the chosen glyph onto the canvas as an inline-SVG "icon" node that tints via the
// design's Color variables. No API key; CORS-enabled; SVGs use `currentColor`.

const API = 'https://api.iconify.design';

// Style tags. Iconify has no single "style" filter, so each tag maps to a set of
// icon-set prefixes (used to narrow the search) plus an optional per-name test for
// sets that pack multiple variants under one prefix (e.g. Material `ic:sharp-*`).
const phRegular = n => !/-(fill|duotone|bold|thin|light)$/.test(n);
const STYLE_SOURCES = {
  all: null,
  stroke: [{ p: 'tabler' }, { p: 'lucide' }, { p: 'feather' }, { p: 'iconoir' }, { p: 'mdi-light' }],
  fill: [{ p: 'mdi' }, { p: 'bxs' }, { p: 'ph', t: n => n.endsWith('-fill') }, { p: 'ic', t: n => n.startsWith('baseline-') }],
  sharp: [{ p: 'ic', t: n => n.startsWith('sharp-') }],
  rounded: [{ p: 'ic', t: n => n.startsWith('round-') }, { p: 'ph', t: phRegular }, { p: 'ri', t: n => n.endsWith('-line') || n.endsWith('-fill') }],
  duotone: [{ p: 'ph', t: n => n.endsWith('-duotone') }, { p: 'solar', t: n => n.endsWith('-bold-duotone') }],
  animated: [{ p: 'line-md' }, { p: 'svg-spinners' }, { p: 'eos-icons' }],
};
const STYLES = [
  ['all', 'All'], ['stroke', 'Stroke'], ['fill', 'Fill'], ['sharp', 'Sharp'],
  ['rounded', 'Rounded'], ['duotone', 'Duotone'], ['animated', 'Animated'],
];

let modal, titleEl, stylesEl, searchInput, results;
let activeStyle = 'all';
let replaceTargetId = null;   // set when opened to swap an existing icon
let searchToken = 0;          // guards against out-of-order async responses
let seeded = false;
let debounce;

const path = id => id.replace(':', '/'); // 'mdi:home' → 'mdi/home'

function filterByStyle(ids, style) {
  const src = STYLE_SOURCES[style];
  if (!src) return ids;
  return ids.filter(id => {
    const i = id.indexOf(':');
    const p = id.slice(0, i), n = id.slice(i + 1);
    return src.some(s => s.p === p && (!s.t || s.t(n)));
  });
}

function msg(text) { results.innerHTML = `<div class="icon-msg">${esc(text)}</div>`; }

function renderResults(ids) {
  if (!ids.length) { msg('No icons found — try another term or a different style.'); return; }
  results.innerHTML = ids.slice(0, 120).map(id =>
    `<button class="icon-tile" data-icon="${esc(id)}" title="${esc(id)}"><img src="${API}/${path(id)}.svg?height=26&color=%23cdd2db" alt="" loading="lazy"></button>`
  ).join('');
}

async function runSearch() {
  const q = searchInput.value.trim();
  if (!q) { msg('Type to search thousands of open-source icons.'); return; }
  const src = STYLE_SOURCES[activeStyle];
  const prefixes = src ? [...new Set(src.map(s => s.p))] : [];
  const url = `${API}/search?query=${encodeURIComponent(q)}&limit=120${prefixes.length ? `&prefixes=${prefixes.join(',')}` : ''}`;
  const token = ++searchToken;
  msg('Searching…');
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (token !== searchToken) return; // a newer search superseded this one
    renderResults(filterByStyle(data.icons || [], activeStyle));
  } catch {
    if (token === searchToken) msg('Could not reach the icon service — check your connection.');
  }
}

// Keep an icon's proportions by reading its viewBox aspect ratio.
function svgAspect(svg) {
  const m = svg.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/);
  if (m) { const w = parseFloat(m[1]), h = parseFloat(m[2]); if (w > 0 && h > 0) return w / h; }
  return 1;
}

function placeIcon(svg, iconId) {
  const h = 40, w = Math.max(8, Math.round(h * svgAspect(svg)));
  const world = canvasToWorld(canvasWrap.offsetWidth / 2, canvasWrap.offsetHeight / 2);
  let parent = null;
  if (state.selected.size === 1) { const s = getNode([...state.selected][0]); if (canAcceptChild(s)) parent = s; }
  let x, y;
  if (parent) { if (isSingleChild(parent)) { x = 0; y = 0; } else { x = parent.w / 2 - w / 2; y = parent.h / 2 - h / 2; } }
  else { x = world.x - w / 2; y = world.y - h / 2; }
  const node = makeNode('icon', x, y, w, h, parent ? parent.id : null);
  node.svg = svg; node.iconId = iconId;
  if (parent) parent.children.push(node.id);
  state.nodes.push(node);
  state.selected.clear(); state.selected.add(node.id);
  saveHistory(); render();
}

function replaceIcon(id, svg, iconId) {
  const node = getNode(id);
  if (!node) return;
  node.svg = svg; node.iconId = iconId; // keep the node's current size/position
  saveHistory(); render();
}

async function pick(id) {
  const replacing = replaceTargetId;
  try {
    const res = await fetch(`${API}/${path(id)}.svg`); // no color → keeps currentColor
    const svg = await res.text();
    if (!res.ok || !svg.includes('<svg')) throw 0;
    close();
    if (replacing) replaceIcon(replacing, svg, id); else placeIcon(svg, id);
    showToast(replacing ? 'Icon replaced' : `Added ${id}`);
  } catch { showToast('Could not load that icon — try another'); }
}

function open(replaceId = null) {
  replaceTargetId = replaceId;
  titleEl.textContent = replaceId ? 'Replace icon' : 'Add icon';
  modal.hidden = false;
  searchInput.focus(); searchInput.select();
  if (!seeded) { seeded = true; searchInput.value = 'home'; }
  runSearch();
}

function close() { modal.hidden = true; replaceTargetId = null; }

export function initIconPicker() {
  modal = document.getElementById('icon-modal');
  if (!modal) return; // not on this page
  titleEl = document.getElementById('icon-modal-title');
  stylesEl = document.getElementById('icon-styles');
  searchInput = document.getElementById('icon-search');
  results = document.getElementById('icon-results');

  stylesEl.innerHTML = STYLES.map(([v, l]) =>
    `<button class="icon-chip ${v === 'all' ? 'active' : ''}" data-style="${v}">${l}</button>`).join('');

  stylesEl.addEventListener('click', e => {
    const chip = e.target.closest('.icon-chip');
    if (!chip) return;
    activeStyle = chip.dataset.style;
    stylesEl.querySelectorAll('.icon-chip').forEach(c => c.classList.toggle('active', c === chip));
    runSearch();
  });

  searchInput.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(runSearch, 250); });
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(debounce); runSearch(); } });

  results.addEventListener('click', e => {
    const tile = e.target.closest('.icon-tile');
    if (tile) pick(tile.dataset.icon);
  });

  // Openers: the toolbar Icon tool (add), and the props "Replace icon" button (swap).
  document.getElementById('tool-icon')?.addEventListener('click', () => open());
  document.addEventListener('icon:replace', e => open(e.detail.id));

  // Close: button, backdrop click, Escape.
  document.getElementById('icon-close')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) { e.stopPropagation(); close(); } });
}
