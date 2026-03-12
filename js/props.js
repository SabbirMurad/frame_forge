import { state, getNode } from './state.js';
import { noSelection, propsFields, esc } from './utils.js';
import { updateNodeEl } from './render.js';
import { renderLayers } from './layers.js';

export function renderProps() {
  if (state.selected.size === 0) {
    noSelection.style.display = '';
    propsFields.style.display = 'none';
    return;
  }
  noSelection.style.display = 'none';
  propsFields.style.display = '';

  const node = getNode([...state.selected][0]);
  if (!node) return;

  propsFields.innerHTML = `
    <div class="prop-section">
      <div class="prop-row">
        <span class="prop-label-wide" style="width:100%;display:block">
          <input class="prop-input" id="p-name" value="${esc(node.name)}" style="width:100%" placeholder="Layer name">
        </span>
      </div>
      ${node.parentId ? `<div style="font-size:10px;color:var(--text3);margin-top:2px">in <span style="color:var(--accent)">${esc(getNode(node.parentId)?.name || '?')}</span></div>` : ''}
    </div>
    <div class="prop-section">
      <div class="prop-section-title">Layout</div>
      <div class="prop-row">
        <span class="prop-label">X</span>
        <input class="prop-input" id="p-x" type="number" value="${Math.round(node.x)}">
        <span class="prop-label">Y</span>
        <input class="prop-input" id="p-y" type="number" value="${Math.round(node.y)}">
      </div>
      <div class="prop-row">
        <span class="prop-label">W</span>
        <input class="prop-input" id="p-w" type="number" value="${Math.round(node.w)}">
        <span class="prop-label">H</span>
        <input class="prop-input" id="p-h" type="number" value="${Math.round(node.h)}">
      </div>
      ${node.type !== 'ellipse' && node.type !== 'text' ? `
      <div class="prop-row">
        <span class="prop-label">R</span>
        <input class="prop-input" id="p-radius" type="number" value="${node.radius}" min="0">
        <span class="prop-label">%</span>
        <input class="prop-input" id="p-opacity" type="number" value="${Math.round(node.opacity * 100)}" min="0" max="100">
      </div>` : `
      <div class="prop-row">
        <span class="prop-label">%</span>
        <input class="prop-input" id="p-opacity" type="number" value="${Math.round(node.opacity * 100)}" min="0" max="100">
      </div>`}
    </div>
    ${node.type !== 'text' ? `
    <div class="prop-section">
      <div class="prop-section-title">Fill</div>
      <div class="color-row">
        <input type="color" class="color-swatch" id="p-fill" value="${node.fill === 'transparent' ? '#ffffff' : node.fill}">
        <input class="prop-input" id="p-fill-hex" value="${node.fill}" style="font-family:var(--mono);font-size:11px">
      </div>
    </div>
    <div class="prop-section">
      <div class="prop-section-title">Stroke</div>
      <div class="color-row">

        <div class="prop-column">
          <span class="prop-label">Color</span>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="color" class="color-swatch" id="p-stroke" value="${node.stroke === 'transparent' ? '#000000' : node.stroke}">
            <input class="prop-input" id="p-stroke-hex" value="${node.stroke}" style="font-family:var(--mono);font-size:11px">
          </div>
        </div>
        <div class="prop-column">
          <span class="prop-label">Opacity</span>
          <input class="prop-input" id="p-stroke-opacity" type="number" value="${Math.round((node.strokeOpacity ?? 1) * 100)}" min="0" max="100">
        </div>
      </div>
      <div class="prop-row">
        <div class="prop-column">
          <span class="prop-label">Size</span>
          <input class="prop-input" id="p-strokew" type="number" value="${node.strokeW}" min="0" style="width:50px">
        </div>
        <div class="prop-column">
          <span class="prop-label">Opacity</span>
          <input class="prop-input" id="p-stroke-opacity" type="number" value="${Math.round((node.strokeOpacity ?? 1) * 100)}" min="0" max="100">
        </div>
        <div class="prop-column">
          <span class="prop-label-wide">Style</span>
          <select class="prop-input" id="p-stroke-style">
            <option ${(node.strokeStyle || 'solid') === 'solid' ? 'selected' : ''}>solid</option>
            <option ${node.strokeStyle === 'dashed' ? 'selected' : ''}>dashed</option>
            <option ${node.strokeStyle === 'dotted' ? 'selected' : ''}>dotted</option>
            <option ${node.strokeStyle === 'double' ? 'selected' : ''}>double</option>
          </select>
        </div>
      </div>
    </div>` : `
    <div class="prop-section">
      <div class="prop-section-title">Text</div>
      <div class="prop-row">
        <textarea class="prop-input" id="p-text" rows="3" style="resize:vertical">${esc(node.text)}</textarea>
      </div>
      <div class="prop-row">
        <span class="prop-label">Sz</span>
        <input class="prop-input" id="p-fontsize" type="number" value="${node.fontSize}" min="1">
        <span class="prop-label">W</span>
        <select class="prop-input" id="p-fontweight">
          ${['300', '400', '500', '600', '700'].map(w => `<option ${node.fontWeight == w ? 'selected' : ''}>${w}</option>`).join('')}
        </select>
      </div>
      <div class="color-row">
        <input type="color" class="color-swatch" id="p-color" value="${node.color}">
        <input class="prop-input" id="p-color-hex" value="${node.color}" style="font-family:var(--mono);font-size:11px">
      </div>
    </div>`}
    <div class="prop-section">
      <div class="prop-section-title">Constraints</div>
      <div class="prop-row">
        <span class="prop-label-wide">Horiz</span>
        <select class="prop-input" id="p-ch">
          <option ${node.constraints.h == 'left' ? 'selected' : ''}>left</option>
          <option ${node.constraints.h == 'right' ? 'selected' : ''}>right</option>
          <option ${node.constraints.h == 'center' ? 'selected' : ''}>center</option>
          <option ${node.constraints.h == 'stretch' ? 'selected' : ''}>stretch</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label-wide">Vert</span>
        <select class="prop-input" id="p-cv">
          <option ${node.constraints.v == 'top' ? 'selected' : ''}>top</option>
          <option ${node.constraints.v == 'bottom' ? 'selected' : ''}>bottom</option>
          <option ${node.constraints.v == 'center' ? 'selected' : ''}>center</option>
          <option ${node.constraints.v == 'stretch' ? 'selected' : ''}>stretch</option>
        </select>
      </div>
    </div>
  `;

  // Bind inputs
  bindProp('p-name', v => { node.name = v; renderLayers(); });
  bindPropNum('p-x', v => { node.x = v; updateNodeEl(node); });
  bindPropNum('p-y', v => { node.y = v; updateNodeEl(node); });
  bindPropNum('p-w', v => { node.w = Math.max(1, v); updateNodeEl(node); });
  bindPropNum('p-h', v => { node.h = Math.max(1, v); updateNodeEl(node); });
  bindPropNum('p-opacity', v => { node.opacity = Math.min(1, Math.max(0, v / 100)); updateNodeEl(node); });

  if (node.type !== 'ellipse' && node.type !== 'text') {
    bindPropNum('p-radius', v => { node.radius = Math.max(0, v); updateNodeEl(node); });
  }

  if (node.type !== 'text') {
    bindColor('p-fill', 'p-fill-hex', v => { node.fill = v; updateNodeEl(node); });
    bindColor('p-stroke', 'p-stroke-hex', v => { node.stroke = v; updateNodeEl(node); });
    bindPropNum('p-strokew', v => { node.strokeW = Math.max(0, v); updateNodeEl(node); });
    bindPropNum('p-stroke-opacity', v => { node.strokeOpacity = Math.min(1, Math.max(0, v / 100)); updateNodeEl(node); });
    const ss = document.getElementById('p-stroke-style');
    if (ss) ss.addEventListener('change', () => { node.strokeStyle = ss.value; updateNodeEl(node); });
  } else {
    const ta = document.getElementById('p-text');
    if (ta) ta.addEventListener('input', () => { node.text = ta.value; updateNodeEl(node); });
    bindPropNum('p-fontsize', v => { node.fontSize = Math.max(1, v); updateNodeEl(node); });
    const fw = document.getElementById('p-fontweight');
    if (fw) fw.addEventListener('change', () => { node.fontWeight = fw.value; updateNodeEl(node); });
    bindColor('p-color', 'p-color-hex', v => { node.color = v; updateNodeEl(node); });
  }

  const ch = document.getElementById('p-ch');
  const cv = document.getElementById('p-cv');
  if (ch) ch.addEventListener('change', () => { node.constraints.h = ch.value; });
  if (cv) cv.addEventListener('change', () => { node.constraints.v = cv.value; });
}

function bindProp(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => fn(el.value));
}

function bindPropNum(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => fn(parseFloat(el.value) || 0));
}

function bindColor(colorId, hexId, fn) {
  const colorEl = document.getElementById(colorId);
  const hexEl = document.getElementById(hexId);
  if (colorEl) colorEl.addEventListener('input', () => { if (hexEl) hexEl.value = colorEl.value; fn(colorEl.value); });
  if (hexEl) hexEl.addEventListener('input', () => { if (hexEl.value.match(/^#[0-9a-f]{6}$/i)) { if (colorEl) colorEl.value = hexEl.value; fn(hexEl.value); } });
}
