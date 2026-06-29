import { state, getNode, makeNode, seedDefaults } from './state.js';
import { canvasWrap, addMenu, frameMenu, closeMenus, showToast } from './utils.js';
import { canvasToWorld, canAcceptChild, SINGLE_CHILD_TYPES } from './nodes.js';
import { saveHistory } from './history.js';
import { render, applyTransform } from './render.js';
import { initCanvasEvents } from './canvas.js';
import { initToolEvents, setTool } from './tools.js';
import { findFrameAt, getWorldPos } from './nodes.js';
import { initModels, renderModels } from './models.js';
import { initApi, renderApi } from './api.js';
import { initColors, renderColors } from './colors.js';
import { initTypography, renderTypography } from './typography.js';
import { exportModelsCode } from './codegen.js';
import { updateExportButton } from './validate.js';
import { initDropdowns } from './dropdown.js';
import { addShare } from './shares.js';

// Initialize event systems
initCanvasEvents();
initToolEvents();
initModels();
initApi();
initColors();
initTypography();
initDropdowns();

// Add element menu
document.getElementById('btn-add-layer').addEventListener('click', e => {
  const rect = e.target.getBoundingClientRect();
  addMenu.style.left = rect.right + 4 + 'px';
  addMenu.style.top = rect.bottom + 4 + 'px';
  addMenu.style.display = 'block';
  e.stopPropagation();
});

// Resolve where a new w×h node of `type` should be placed: parent (if a selected
// container/frame can accept it) and the local x/y within that parent or the canvas.
function resolvePlacement(type, w, h) {
  const cx = canvasWrap.offsetWidth / 2;
  const cy = canvasWrap.offsetHeight / 2;
  const world = canvasToWorld(cx, cy);

  let parent = null;
  if (type !== 'frame' && state.selected.size === 1) {
    const selNode = getNode([...state.selected][0]);
    if (canAcceptChild(selNode)) parent = selNode;
  }

  let x, y;
  if (parent) {
    // Single-child wrappers pin to top-left; otherwise center within the parent
    if (SINGLE_CHILD_TYPES.includes(parent.type)) { x = 0; y = 0; }
    else { x = parent.w / 2 - w / 2; y = parent.h / 2 - h / 2; }
  } else {
    x = world.x - w / 2;
    y = world.y - h / 2;
  }
  return { parent, x, y };
}

function finalizeNew(node, parent) {
  if (parent) parent.children.push(node.id);
  state.nodes.push(node);
  state.selected.clear();
  state.selected.add(node.id);
  saveHistory();
  render();
}

// Create an element at the canvas center, nesting into a selected container/frame if possible
function createElement(type) {
  const defaults = { frame: [240, 160], container: [120, 80], row: [200, 200], column: [200, 200], wrap: [200, 200], stack: [200, 200], text: [120, 40] };
  const [w, h] = defaults[type] || [100, 100];
  const { parent, x, y } = resolvePlacement(type, w, h);
  const node = makeNode(type, x, y, w, h, parent ? parent.id : null);
  finalizeNew(node, parent);
}

function createImageNode(src, w, h) {
  const { parent, x, y } = resolvePlacement('image', w, h);
  const node = makeNode('image', x, y, w, h, parent ? parent.id : null);
  node.src = src;
  finalizeNew(node, parent);
}

addMenu.addEventListener('click', e => {
  const item = e.target.closest('.ctx-item');
  if (!item) return;
  createElement(item.dataset.addtype);
  closeMenus();
});

// Image tool — open the file picker, then place the chosen image (scaled to a sane size)
const imageInput = document.getElementById('image-input');
document.getElementById('tool-image').addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  imageInput.value = ''; // allow re-picking the same file later
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const src = reader.result;
    const probe = new Image();
    probe.onload = () => {
      let w = probe.naturalWidth || 200;
      let h = probe.naturalHeight || 200;
      const max = 320;
      if (w > max || h > max) { const s = max / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
      createImageNode(src, w, h);
      showToast(`Added "${file.name}"`);
    };
    probe.src = src;
  };
  reader.readAsDataURL(file);
});

// Layout tools create a fixed 200x200 element on click (no drag-to-size needed)
['row', 'column', 'wrap', 'stack'].forEach(type => {
  const btn = document.getElementById('tool-' + type);
  if (btn) btn.addEventListener('click', () => createElement(type));
});

// Export all model code as a downloadable Dart project (one file per model + used enums)
document.getElementById('btn-export-code')?.addEventListener('click', (e) => {
  e.preventDefault();
  // The icon isn't natively disabled (so its hover hint shows); guard here instead.
  if (e.currentTarget.classList.contains('has-error')) { showToast('Fix errors before exporting'); return; }
  const r = exportModelsCode();
  if (!r.ok) { showToast('Nothing to export — create a model or provider first'); return; }
  const parts = [];
  if (r.models) parts.push(`${r.models} model${r.models === 1 ? '' : 's'}`);
  if (r.enums) parts.push(`${r.enums} enum${r.enums === 1 ? '' : 's'}`);
  if (r.providers) parts.push(`${r.providers} provider${r.providers === 1 ? '' : 's'}`);
  let msg = 'Exported ' + (parts.join(' + ') || 'nothing');
  if (r.skipped) msg += ` (${r.skipped} skipped — fix name errors)`;
  showToast(msg);
});

// Nav icons.
document.getElementById('nav-home')?.addEventListener('click', () => { window.location.href = 'home.html'; });
document.getElementById('nav-sync')?.addEventListener('click', () => showToast('Sync — coming soon'));
document.getElementById('nav-logout')?.addEventListener('click', () => { window.location.href = 'auth.html'; });

// Share project — invite by email (the request shows up in the home Requests tab).
const shareModal = document.getElementById('share-modal');
const shareEmail = document.getElementById('share-email');
const closeShare = () => { if (shareModal) { shareModal.hidden = true; document.getElementById('share-form')?.reset(); } };
document.getElementById('nav-share')?.addEventListener('click', () => { shareModal.hidden = false; shareEmail?.focus(); });
document.getElementById('share-close')?.addEventListener('click', closeShare);
document.getElementById('share-cancel')?.addEventListener('click', closeShare);
shareModal?.addEventListener('click', e => { if (e.target === shareModal) closeShare(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && shareModal && !shareModal.hidden) closeShare(); });
document.getElementById('share-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const email = shareEmail.value.trim();
  if (!email) return;
  addShare(email, state.projectName);
  closeShare();
  showToast(`Invitation sent to ${email}`);
});

// Keep the export button's enabled/disabled state in sync with project validity.
// These events cover edits (input), commits (change), dropdown picks (dd:change),
// add/delete clicks, and undo/redo + delete keystrokes (keyup).
['input', 'change', 'dd:change', 'click', 'keyup'].forEach(ev =>
  document.addEventListener(ev, () => updateExportButton()));

// Project name (editable)
const projectNameInput = document.getElementById('project-name');
if (projectNameInput) {
  projectNameInput.value = state.projectName;
  projectNameInput.addEventListener('input', () => { state.projectName = projectNameInput.value; });
}

// Collapse / expand the left sidebar
document.getElementById('sidebar-toggle')?.addEventListener('click', () => document.body.classList.add('sidebar-collapsed'));
document.getElementById('sidebar-open')?.addEventListener('click', () => document.body.classList.remove('sidebar-collapsed'));

// Left-panel mode tabs (Design / Model / API)
const modeTabs = document.querySelectorAll('.mode-tab');
const designView = document.getElementById('design-view');
const modelBoard = document.getElementById('model-board');
const apiBoard = document.getElementById('api-board');
const colorBoard = document.getElementById('color-board');
const colorPanel = document.getElementById('color-panel');
const typoBoard = document.getElementById('typo-board');
const typoPanel = document.getElementById('typo-panel');
modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    modeTabs.forEach(t => t.classList.toggle('active', t === tab));
    const mode = tab.dataset.mode;
    const isDesign = mode === 'design';
    // Design-only chrome (toolbar, zoom, props panel, rulers) is hidden via this class
    document.body.classList.toggle('design-mode', isDesign);
    designView.style.display = isDesign ? '' : 'none';
    modelBoard.style.display = mode === 'model' ? 'flex' : 'none';
    apiBoard.style.display = mode === 'api' ? 'flex' : 'none';
    colorBoard.style.display = mode === 'color' ? 'flex' : 'none';
    colorPanel.style.display = mode === 'color' ? 'flex' : 'none';
    typoBoard.style.display = mode === 'typography' ? 'flex' : 'none';
    typoPanel.style.display = mode === 'typography' ? 'flex' : 'none';
    if (mode === 'model') renderModels();
    if (mode === 'api') renderApi();
    if (mode === 'color') renderColors();
    if (mode === 'typography') renderTypography();
    if (isDesign) render(); // refresh canvas in case color variables changed
  });
});

// Frame preset menu — opens above the frame tool button (toolbar is bottom-anchored)
const frameBtn = document.getElementById('tool-frame');
frameBtn.addEventListener('click', e => {
  e.stopPropagation();
  const open = frameMenu.style.display === 'block';
  closeMenus();
  if (open) return;
  frameMenu.style.display = 'block';
  const r = frameBtn.getBoundingClientRect();
  let left = r.left + r.width / 2 - frameMenu.offsetWidth / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - frameMenu.offsetWidth - 8));
  frameMenu.style.left = left + 'px';
  frameMenu.style.top = (r.top - frameMenu.offsetHeight - 8) + 'px';
});

frameMenu.addEventListener('click', e => {
  const item = e.target.closest('.frame-menu-item');
  if (!item) return;
  const w = parseInt(item.dataset.w, 10);
  const h = parseInt(item.dataset.h, 10);
  const cx = canvasWrap.offsetWidth / 2;
  const cy = canvasWrap.offsetHeight / 2;
  const world = canvasToWorld(cx, cy);

  const node = makeNode('frame', world.x - w / 2, world.y - h / 2, w, h, null);
  node.name = 'Frame_' + state.nextFrameNum++;
  state.nodes.push(node);
  state.selected.clear();
  state.selected.add(node.id);
  saveHistory();
  render();
  closeMenus();
});

// Boot
seedDefaults(); // pre-create white/black colors + a default "body" type style
saveHistory();
applyTransform();
render();
updateExportButton();
showToast('FrameForge ready \u2014 press V to select, R for container, T for text');
