import { state, getNode, makeNode } from './state.js';
import { canvasWrap, addMenu, frameMenu, closeMenus, showToast } from './utils.js';
import { canvasToWorld, canAcceptChild, SINGLE_CHILD_TYPES } from './nodes.js';
import { saveHistory } from './history.js';
import { render, applyTransform } from './render.js';
import { initCanvasEvents } from './canvas.js';
import { initToolEvents, setTool } from './tools.js';
import { findFrameAt, getWorldPos } from './nodes.js';
import { initModels, renderModels } from './models.js';
import { initApi, renderApi } from './api.js';

// Initialize event systems
initCanvasEvents();
initToolEvents();
initModels();
initApi();

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

// Left-panel mode tabs (Design / Model / API)
const modeTabs = document.querySelectorAll('.mode-tab');
const designView = document.getElementById('design-view');
const modelBoard = document.getElementById('model-board');
const apiBoard = document.getElementById('api-board');
modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    modeTabs.forEach(t => t.classList.toggle('active', t === tab));
    const mode = tab.dataset.mode;
    const isDesign = mode === 'design';
    const isModel = mode === 'model';
    const isApi = mode === 'api';
    // Design-only chrome (toolbar, zoom, props panel, rulers) is hidden via this class
    document.body.classList.toggle('design-mode', isDesign);
    designView.style.display = isDesign ? '' : 'none';
    modelBoard.style.display = isModel ? 'flex' : 'none';
    apiBoard.style.display = isApi ? 'flex' : 'none';
    if (isModel) renderModels();
    if (isApi) renderApi();
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
saveHistory();
applyTransform();
render();
showToast('FrameForge ready \u2014 press V to select, R for container, T for text');
