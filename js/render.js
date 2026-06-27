import { state, getNode, getColorById, getTypoById } from './state.js';
import { colorCss } from './colors.js';
import { SINGLE_CHILD_TYPES, MULTI_CHILD_TYPES } from './nodes.js';
import { canvas, zoomLabel, canvasWrap } from './utils.js';
import { drawRulers } from './rulers.js';
import { renderLayers } from './layers.js';
import { renderProps } from './props.js';
import { attachNodeEvents } from './canvas.js';

export function applyTransform() {
  canvas.style.transform = `translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;
  if (zoomLabel) zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
  drawRulers();
}

export function render() {
  canvas.querySelectorAll('.node').forEach(e => e.remove());
  const roots = state.nodes.filter(n => !n.parentId);
  roots.forEach(n => renderNode(n, canvas));
  renderLayers();
  renderProps();
}

export const FLEX_TYPES = ['row', 'column', 'wrap'];

// Lay out a node's children with flexbox (auto-layout) instead of absolute positions
function applyFlexLayout(el, node) {
  el.style.display = node.visible ? 'flex' : 'none';
  el.style.alignContent = 'flex-start';
  if (node.type === 'row') {
    el.style.flexDirection = 'row'; el.style.flexWrap = 'nowrap'; el.style.gap = node.gap + 'px';
  } else if (node.type === 'column') {
    el.style.flexDirection = 'column'; el.style.flexWrap = 'nowrap'; el.style.gap = node.gap + 'px';
  } else if (node.type === 'wrap') {
    el.style.flexDirection = 'row'; el.style.flexWrap = 'wrap'; el.style.gap = node.gapV + 'px ' + node.gapH + 'px';
  }
}

const ALIGN_H = { left: 'flex-start', center: 'center', right: 'flex-end' };
const ALIGN_V = { top: 'flex-start', center: 'center', bottom: 'flex-end' };

// Single-child wrappers (frame/container) align their child via flexbox,
// driven by the wrapper's `alignment` property.
function applyWrapperAlignment(el, node) {
  if (!SINGLE_CHILD_TYPES.includes(node.type)) return;
  const a = node.alignment || { h: 'left', v: 'top' };
  el.style.display = node.visible ? 'flex' : 'none';
  el.style.justifyContent = ALIGN_H[a.h] || 'flex-start';
  el.style.alignItems = ALIGN_V[a.v] || 'flex-start';
}

// Place a node based on its parent:
//  - flex parent (row/column/wrap)   → flex item, auto-laid-out
//  - single-child wrapper (frame/container) → flex item, aligned by the wrapper
//  - stack or canvas root             → free absolute positioning (x/y)
function applyPosition(el, node) {
  const parentNode = node.parentId ? getNode(node.parentId) : null;
  if (parentNode && FLEX_TYPES.includes(parentNode.type)) {
    el.style.position = 'relative';
    el.style.left = '';
    el.style.top = '';
    el.style.flex = '0 0 auto';
  } else if (parentNode && SINGLE_CHILD_TYPES.includes(parentNode.type)) {
    el.style.position = 'relative';
    el.style.flex = '0 0 auto';
    el.style.left = '';
    el.style.top = '';
  } else {
    el.style.position = 'absolute';
    el.style.flex = '';
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';
  }
}

// Paint an image node's picture as its background (call after setting the fill)
const IMAGE_FIT = { cover: 'cover', contain: 'contain', fill: '100% 100%', fitWidth: '100% auto', fitHeight: 'auto 100%' };

function stopColorCss(s) {
  const a = s.alpha == null ? 1 : s.alpha;
  if (a >= 1) return s.color;
  let h = (s.color || '#000000').replace('#', '');
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  const n = parseInt(h.slice(0, 6) || '0', 16) || 0;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
function gradientStops(stops) {
  return [...stops].sort((a, b) => a.pos - b.pos).map(s => `${stopColorCss(s)} ${s.pos}%`).join(', ');
}
export function gradientCss(node) {
  const g = node.gradient || { angle: 90, stops: [] };
  if (node.fillType === 'radial') return `radial-gradient(circle at center, ${gradientStops(g.stops)})`;
  return `linear-gradient(${g.angle}deg, ${gradientStops(g.stops)})`;
}

// Paint a node's fill: solid color, linear/radial gradient, or image.
// Frame/container take their fill from a referenced Color variable when set.
function applyFill(el, node) {
  if (node.type === 'image') {
    // Fill comes from a referenced Color variable (same as container); the
    // picture is layered on top of that fill.
    let src = node;
    if (node.colorId) { const c = getColorById(node.colorId); if (c) src = c; }
    const isGrad = src.fillType === 'linear' || src.fillType === 'radial';
    const pic = node.src ? `url("${node.src}")` : '';
    const fit = IMAGE_FIT[node.fit] || 'cover';
    if (isGrad) {
      el.style.backgroundColor = 'transparent';
      el.style.backgroundImage = pic ? `${pic}, ${gradientCss(src)}` : gradientCss(src);
      el.style.backgroundSize = pic ? `${fit}, 100% 100%` : '100% 100%';
    } else {
      el.style.backgroundColor = src.fill === 'transparent' ? 'transparent' : src.fill;
      el.style.backgroundImage = pic;
      el.style.backgroundSize = pic ? fit : '';
    }
    el.style.backgroundPosition = 'center';
    el.style.backgroundRepeat = 'no-repeat';
    return;
  }
  let src = node;
  if ((node.type === 'frame' || node.type === 'container') && node.colorId) {
    const c = getColorById(node.colorId);
    if (c) src = c;
  }
  if (src.fillType === 'linear' || src.fillType === 'radial') {
    el.style.backgroundColor = 'transparent';
    el.style.backgroundImage = gradientCss(src);
    el.style.backgroundSize = ''; el.style.backgroundRepeat = '';
  } else {
    el.style.backgroundColor = src.fill;
    el.style.backgroundImage = '';
  }
}

// Size a node: layout types (row/column/wrap/stack) fill their single-child wrapper parent
function applySize(el, node) {
  const parentNode = node.parentId ? getNode(node.parentId) : null;
  if (parentNode && SINGLE_CHILD_TYPES.includes(parentNode.type) && MULTI_CHILD_TYPES.includes(node.type)) {
    el.style.width = '100%';
    el.style.height = '100%';
  } else {
    el.style.width = node.w + 'px';
    el.style.height = node.h + 'px';
  }
}

// Container/image stroke comes from a referenced solid Color variable; others use their own stroke.
function strokeColor(node) {
  if (node.type === 'container' || node.type === 'image') {
    const cv = node.strokeColorId ? getColorById(node.strokeColorId) : null;
    if (cv && cv.fillType === 'solid') {
      return applyStrokeOpacity(cv.fill, cv.alpha == null ? 1 : cv.alpha);
    }
    return 'transparent';
  }
  return applyStrokeOpacity(node.stroke, node.strokeOpacity);
}
function applyStroke(el, node) {
  if (node.strokeW > 0) el.style.border = `${node.strokeW}px ${node.strokeStyle || 'solid'} ${strokeColor(node)}`;
  else el.style.border = 'none';
}

// A text node takes all its typography (family/size/weight/line-height/spacing
// and colour) from a referenced Typography style variable. With no style
// selected it falls back to a plain default so the text stays legible.
export function applyTextStyle(el, node) {
  const t = node.typoId ? getTypoById(node.typoId) : null;
  if (t) {
    el.style.fontFamily = /\s/.test(t.fontFamily) ? `'${t.fontFamily}'` : t.fontFamily;
    el.style.fontSize = t.fontSize + 'px';
    el.style.fontWeight = t.fontWeight;
    el.style.lineHeight = t.lineHeight;
    el.style.letterSpacing = t.letterSpacing + 'px';
    const c = t.colorId ? getColorById(t.colorId) : null;
    el.style.color = c && c.fillType === 'solid' ? colorCss(c) : '#1a1a1a';
  } else {
    el.style.fontFamily = '';
    el.style.fontSize = (node.fontSize || 16) + 'px';
    el.style.fontWeight = node.fontWeight || '400';
    el.style.lineHeight = '1.4';
    el.style.letterSpacing = '';
    el.style.color = node.color || '#1a1a1a';
  }
}

export function renderNode(node, parent) {
  const el = document.createElement('div');
  el.className = 'node ' + (node.type === 'text' ? 'text-node' : node.type);
  el.id = 'node-' + node.id;
  el.dataset.id = node.id;

  applyPosition(el, node);
  applySize(el, node);
  el.style.opacity = node.opacity;
  el.style.display = node.visible ? '' : 'none';
  applyWrapperAlignment(el, node);

  if (node.type !== 'text') {
    applyFill(el, node);
    applyStroke(el, node);
    el.style.borderRadius = node.shape === 'circle' ? '50%' : node.radius + 'px';
    if (FLEX_TYPES.includes(node.type)) applyFlexLayout(el, node);
  } else {
    applyTextStyle(el, node);
    el.textContent = node.text;
  }

  if (state.selected.has(node.id)) {
    el.classList.add('selected');
    if (node.type !== 'frame') addHandles(el);
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
  applyPosition(el, node);
  applySize(el, node);
  applyWrapperAlignment(el, node);
  el.style.opacity = node.opacity;
  if (node.type !== 'text') {
    applyFill(el, node);
    applyStroke(el, node);
    el.style.borderRadius = node.shape === 'circle' ? '50%' : node.radius + 'px';
    if (FLEX_TYPES.includes(node.type)) applyFlexLayout(el, node);
  } else {
    applyTextStyle(el, node);
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
