import { state, getNode } from './state.js';
import { canvas, zoomLabel, canvasWrap } from './utils.js';
import { drawRulers } from './rulers.js';
import { renderLayers } from './layers.js';
import { renderProps } from './props.js';
import { attachNodeEvents } from './canvas.js';

export function applyTransform() {
  canvas.style.transform = `translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;
  zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
  drawRulers();
}

export function render() {
  canvas.querySelectorAll('.node').forEach(e => e.remove());
  const roots = state.nodes.filter(n => !n.parentId);
  roots.forEach(n => renderNode(n, canvas));
  renderLayers();
  renderProps();
}

export function renderNode(node, parent) {
  const el = document.createElement('div');
  el.className = 'node ' + (node.type === 'text' ? 'text-node' : node.type);
  el.id = 'node-' + node.id;
  el.dataset.id = node.id;

  el.style.left = node.x + 'px';
  el.style.top = node.y + 'px';
  el.style.width = node.w + 'px';
  el.style.height = node.h + 'px';
  el.style.opacity = node.opacity;
  el.style.display = node.visible ? '' : 'none';

  if (node.type !== 'text') {
    el.style.background = node.fill;
    if (node.strokeW > 0) {
      el.style.border = `${node.strokeW}px ${node.strokeStyle || 'solid'} ${node.stroke}`;
      el.style.borderColor = applyStrokeOpacity(node.stroke, node.strokeOpacity);
    } else {
      el.style.border = 'none';
    }
    el.style.borderRadius = node.radius + 'px';
    if (node.type === 'ellipse') el.style.borderRadius = '50%';
  } else {
    el.style.fontSize = node.fontSize + 'px';
    el.style.fontWeight = node.fontWeight;
    el.style.color = node.color;
    el.style.lineHeight = '1.4';
    el.textContent = node.text;
  }

  if (state.selected.has(node.id)) {
    el.classList.add('selected');
    addHandles(el);
  }

  if (node.children && node.children.length) {
    node.children.forEach(childId => {
      const child = getNode(childId);
      if (child) renderNode(child, el);
    });
  }

  parent.appendChild(el);
  attachNodeEvents(el, node);
}

function addHandles(el) {
  ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].forEach(pos => {
    const h = document.createElement('div');
    h.className = `handle handle-${pos}`;
    h.dataset.handle = pos;
    el.appendChild(h);
  });
}

export function updateNodeEl(node) {
  const el = document.getElementById('node-' + node.id);
  if (!el) return;
  el.style.left = node.x + 'px';
  el.style.top = node.y + 'px';
  el.style.width = node.w + 'px';
  el.style.height = node.h + 'px';
  el.style.opacity = node.opacity;
  if (node.type !== 'text') {
    el.style.background = node.fill;
    if (node.strokeW > 0) {
      el.style.border = `${node.strokeW}px ${node.strokeStyle || 'solid'} ${node.stroke}`;
      el.style.borderColor = applyStrokeOpacity(node.stroke, node.strokeOpacity);
    } else {
      el.style.border = 'none';
    }
    el.style.borderRadius = node.type === 'ellipse' ? '50%' : node.radius + 'px';
  } else {
    el.style.fontSize = node.fontSize + 'px';
    el.style.fontWeight = node.fontWeight;
    el.style.color = node.color;
    el.textContent = node.text;
  }
}

export function zoomAt(f) {
  const cx = canvasWrap.offsetWidth / 2;
  const cy = canvasWrap.offsetHeight / 2;
  const wx = (cx - state.panX) / state.zoom;
  const wy = (cy - state.panY) / state.zoom;
  state.zoom = Math.min(8, Math.max(0.05, state.zoom * f));
  state.panX = cx - wx * state.zoom;
  state.panY = cy - wy * state.zoom;
  applyTransform();
}

export function fitView() {
  if (!state.nodes.length) return;
  const minX = Math.min(...state.nodes.map(n => n.x));
  const minY = Math.min(...state.nodes.map(n => n.y));
  const maxX = Math.max(...state.nodes.map(n => n.x + n.w));
  const maxY = Math.max(...state.nodes.map(n => n.y + n.h));
  const pad = 60;
  const cw = canvasWrap.offsetWidth, ch = canvasWrap.offsetHeight;
  const z = Math.min((cw - pad * 2) / (maxX - minX), (ch - pad * 2) / (maxY - minY), 4);
  state.zoom = z;
  state.panX = cw / 2 - (minX + (maxX - minX) / 2) * z;
  state.panY = ch / 2 - (minY + (maxY - minY) / 2) * z;
  applyTransform();
}

function applyStrokeOpacity(hex, opacity) {
  if (opacity >= 1 || hex === 'transparent') return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
