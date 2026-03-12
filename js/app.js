import { state, getNode, makeNode } from './state.js';
import { canvasWrap, addMenu, closeMenus, showToast } from './utils.js';
import { canvasToWorld } from './nodes.js';
import { saveHistory } from './history.js';
import { render, applyTransform } from './render.js';
import { initCanvasEvents } from './canvas.js';
import { initToolEvents, setTool } from './tools.js';
import { findFrameAt, getWorldPos } from './nodes.js';

// Initialize event systems
initCanvasEvents();
initToolEvents();

// Add element menu
document.getElementById('btn-add-layer').addEventListener('click', e => {
  const rect = e.target.getBoundingClientRect();
  addMenu.style.left = rect.right + 4 + 'px';
  addMenu.style.top = rect.bottom + 4 + 'px';
  addMenu.style.display = 'block';
  e.stopPropagation();
});

addMenu.addEventListener('click', e => {
  const item = e.target.closest('.ctx-item');
  if (!item) return;
  const type = item.dataset.addtype;
  const cx = canvasWrap.offsetWidth / 2;
  const cy = canvasWrap.offsetHeight / 2;
  const world = canvasToWorld(cx, cy);
  const defaults = { frame: [240, 160], rect: [120, 80], ellipse: [100, 100], text: [120, 40] };
  const [w, h] = defaults[type] || [100, 100];

  let parentFrame = null;
  if (type !== 'frame' && state.selected.size === 1) {
    const selNode = getNode([...state.selected][0]);
    if (selNode && selNode.type === 'frame') parentFrame = selNode;
  }

  let localX, localY;
  if (parentFrame) {
    localX = parentFrame.w / 2 - w / 2;
    localY = parentFrame.h / 2 - h / 2;
  } else {
    localX = world.x - w / 2;
    localY = world.y - h / 2;
  }

  const node = makeNode(type, localX, localY, w, h, parentFrame ? parentFrame.id : null);
  if (parentFrame) parentFrame.children.push(node.id);
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
showToast('FrameForge ready \u2014 press V to select, R for rect, T for text');
