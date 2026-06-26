import { state, getNode } from './state.js';
import { noSelection, propsFields, esc } from './utils.js';
import { colorCss } from './colors.js';
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
      ${node.parentId ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">in <span style="color:var(--accent)">${esc(getNode(node.parentId)?.name || '?')}</span></div>` : ''}
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
        <input class="prop-input" id="p-w" type="number" value="${Math.round(node.w)}" ${node.type === 'frame' ? 'readonly title="Frame size is fixed"' : ''}>
        <span class="prop-label">H</span>
        <input class="prop-input" id="p-h" type="number" value="${Math.round(node.h)}" ${node.type === 'frame' ? 'readonly title="Frame size is fixed"' : ''}>
      </div>
      ${node.type !== 'text' ? `
      <div class="prop-row">
        <span class="prop-label">R</span>
        <input class="prop-input" id="p-radius" type="number" value="${node.radius}" min="0" ${node.shape === 'circle' ? 'disabled title="Radius is controlled by the circle shape"' : ''}>
        <span class="prop-label">%</span>
        <input class="prop-input" id="p-opacity" type="number" value="${Math.round(node.opacity * 100)}" min="0" max="100">
      </div>` : `
      <div class="prop-row">
        <span class="prop-label">%</span>
        <input class="prop-input" id="p-opacity" type="number" value="${Math.round(node.opacity * 100)}" min="0" max="100">
      </div>`}
    </div>
    ${node.type === 'container' ? `
    <div class="prop-section">
      <div class="prop-section-title">Alignment</div>
      <div class="prop-row">
        <span class="prop-label-wide">Horiz</span>
        <div class="align-group">
          <button class="align-btn ${node.alignment.h === 'left' ? 'active' : ''}" data-ah="left" title="Left"><img src="icons/alignment/left.svg" alt="Left"></button>
          <button class="align-btn ${node.alignment.h === 'center' ? 'active' : ''}" data-ah="center" title="Center"><img src="icons/alignment/center-horizontal.svg" alt="Center"></button>
          <button class="align-btn ${node.alignment.h === 'right' ? 'active' : ''}" data-ah="right" title="Right"><img src="icons/alignment/right.svg" alt="Right"></button>
        </div>
      </div>
      <div class="prop-row">
        <span class="prop-label-wide">Vert</span>
        <div class="align-group">
          <button class="align-btn ${node.alignment.v === 'top' ? 'active' : ''}" data-av="top" title="Top"><img src="icons/alignment/top.svg" alt="Top"></button>
          <button class="align-btn ${node.alignment.v === 'center' ? 'active' : ''}" data-av="center" title="Center"><img src="icons/alignment/center-vertical.svg" alt="Center"></button>
          <button class="align-btn ${node.alignment.v === 'bottom' ? 'active' : ''}" data-av="bottom" title="Bottom"><img src="icons/alignment/bottom.svg" alt="Bottom"></button>
        </div>
      </div>
    </div>` : ''}
    ${node.type === 'container' ? `
    <div class="prop-section">
      <div class="prop-section-title">Shape</div>
      <div class="shape-toggle">
        <button class="shape-btn ${node.shape !== 'circle' ? 'active' : ''}" data-shape="rect">Rectangle</button>
        <button class="shape-btn ${node.shape === 'circle' ? 'active' : ''}" data-shape="circle">Circle</button>
      </div>
    </div>` : ''}
    ${node.type === 'row' || node.type === 'column' ? `
    <div class="prop-section">
      <div class="prop-section-title">Layout (${node.type})</div>
      <div class="prop-row">
        <span class="prop-label-wide">Gap</span>
        <input class="prop-input" id="p-gap" type="number" value="${node.gap}" min="0">
      </div>
    </div>` : ''}
    ${node.type === 'wrap' ? `
    <div class="prop-section">
      <div class="prop-section-title">Layout (wrap)</div>
      <div class="prop-row">
        <span class="prop-label-wide">Gap H</span>
        <input class="prop-input" id="p-gaph" type="number" value="${node.gapH}" min="0">
        <span class="prop-label-wide">Gap V</span>
        <input class="prop-input" id="p-gapv" type="number" value="${node.gapV}" min="0">
      </div>
    </div>` : ''}
    ${node.type === 'image' ? `
    <div class="prop-section">
      <div class="prop-section-title">Image</div>
      <div class="prop-row">
        <span class="prop-label-wide">Fit</span>
        <select class="prop-input" id="p-fit">
          <option value="cover" ${(node.fit || 'cover') === 'cover' ? 'selected' : ''}>cover</option>
          <option value="contain" ${node.fit === 'contain' ? 'selected' : ''}>contain</option>
          <option value="fill" ${node.fit === 'fill' ? 'selected' : ''}>fill</option>
          <option value="fitWidth" ${node.fit === 'fitWidth' ? 'selected' : ''}>fit width</option>
          <option value="fitHeight" ${node.fit === 'fitHeight' ? 'selected' : ''}>fit height</option>
        </select>
      </div>
    </div>` : ''}
    ${node.type === 'frame' || node.type === 'container' ? `
    <div class="prop-section">
      <div class="prop-section-title">Color</div>
      ${state.colors.length === 0 ? `
      <div class="api-hint" style="margin-bottom:8px">No colors created yet.</div>
      <button class="goto-colors-btn" id="p-goto-colors">+ Create a color</button>` : `
      <div class="color-pick-grid">
        <button class="color-pick none ${!node.colorId ? 'selected' : ''}" data-pickcolor="" title="None"></button>
        ${state.colors.map(c => `<button class="color-pick ${node.colorId === c.id ? 'selected' : ''}" data-pickcolor="${c.id}" title="${esc(c.name)}" style="background:${colorCss(c)}"></button>`).join('')}
      </div>`}
    </div>` : ''}
    ${node.type !== 'text' && node.type !== 'frame' && node.type !== 'container' ? `
    <div class="prop-section">
      <div class="prop-section-title">Fill</div>
      <div class="shape-toggle" style="margin-bottom:8px">
        <button class="fill-btn ${(node.fillType || 'solid') === 'solid' ? 'active' : ''}" data-filltype="solid">Solid</button>
        <button class="fill-btn ${node.fillType === 'linear' ? 'active' : ''}" data-filltype="linear">Linear</button>
        <button class="fill-btn ${node.fillType === 'radial' ? 'active' : ''}" data-filltype="radial">Radial</button>
      </div>
      ${(node.fillType || 'solid') === 'solid' ? `
      <div class="color-row">
        <input type="color" class="color-swatch" id="p-fill" value="${node.fill === 'transparent' ? '#ffffff' : node.fill}">
        <input class="prop-input" id="p-fill-hex" value="${node.fill}" style="font-family:var(--mono);font-size:12px">
      </div>` : `
      ${node.fillType === 'linear' ? `
      <div class="prop-row">
        <span class="prop-label-wide">Angle</span>
        <input class="prop-input" id="p-grad-angle" type="number" value="${node.gradient.angle}">
      </div>` : ''}
      <div class="grad-stops">
        ${node.gradient.stops.map((s, i) => `
        <div class="grad-stop">
          <input type="color" class="color-swatch" data-stop-color="${i}" value="${s.color}">
          <input class="prop-input" data-stop-hex="${i}" value="${esc(s.color)}" style="font-family:var(--mono);font-size:11px">
          <input class="prop-input" data-stop-pos="${i}" type="number" value="${s.pos}" min="0" max="100" style="width:46px">
          <button class="prop-del" data-stop-del="${i}" title="Remove stop"${node.gradient.stops.length <= 2 ? ' style="visibility:hidden"' : ''}>&times;</button>
        </div>`).join('')}
        <button class="prop-add" id="p-grad-addstop" style="margin:2px 0 0">+ Add stop</button>
      </div>`}
    </div>` : ''}
    ${node.type === 'container' ? `
    <div class="prop-section">
      <div class="prop-section-title">Stroke</div>
      <div class="prop-section-title" style="font-size:11px;text-transform:none;letter-spacing:0;color:var(--text2);margin-bottom:6px">Color</div>
      <div class="color-pick-grid" style="margin-bottom:10px">
        <button class="color-pick none ${!node.strokeColorId ? 'selected' : ''}" data-strokecolor="" title="None"></button>
        ${state.colors.filter(c => c.fillType === 'solid').map(c => `<button class="color-pick ${node.strokeColorId === c.id ? 'selected' : ''}" data-strokecolor="${c.id}" title="${esc(c.name)}" style="background:${colorCss(c)}"></button>`).join('')}
      </div>
      <div class="prop-row">
        <span class="prop-label">Size</span>
        <input class="prop-input" id="p-strokew" type="number" value="${node.strokeW}" min="0" style="width:50px">
        <span class="prop-label-wide">Style</span>
        ${styleDropdown(node)}
      </div>
    </div>` : ''}
    ${node.type !== 'text' && node.type !== 'frame' && node.type !== 'container' ? `
    <div class="prop-section">
      <div class="prop-section-title">Stroke</div>
      <div class="color-row">
        <div class="prop-column">
          <span class="prop-label">Color</span>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="color" class="color-swatch" id="p-stroke" value="${node.stroke === 'transparent' ? '#000000' : node.stroke}">
            <input class="prop-input" id="p-stroke-hex" value="${node.stroke}" style="font-family:var(--mono);font-size:12px">
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
          <span class="prop-label-wide">Style</span>
          ${styleDropdown(node)}
        </div>
      </div>
    </div>` : ''}
    ${node.type === 'text' ? `
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
        <input class="prop-input" id="p-color-hex" value="${node.color}" style="font-family:var(--mono);font-size:12px">
      </div>
    </div>` : ''}
  `;

  // Bind inputs
  bindProp('p-name', v => { node.name = v; renderLayers(); });
  bindPropNum('p-x', v => { node.x = v; updateNodeEl(node); });
  bindPropNum('p-y', v => { node.y = v; updateNodeEl(node); });
  if (node.type !== 'frame') {
    bindPropNum('p-w', v => { node.w = Math.max(1, v); updateNodeEl(node); });
    bindPropNum('p-h', v => { node.h = Math.max(1, v); updateNodeEl(node); });
  }
  bindPropNum('p-opacity', v => { node.opacity = Math.min(1, Math.max(0, v / 100)); updateNodeEl(node); });

  if (node.type !== 'text' && node.shape !== 'circle') {
    bindPropNum('p-radius', v => { node.radius = Math.max(0, v); updateNodeEl(node); });
  }

  if (node.type === 'container') {
    document.querySelectorAll('.shape-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        node.shape = btn.dataset.shape;
        updateNodeEl(node);
        renderProps();
        renderLayers();
      });
    });
  }

  if (node.type === 'image') {
    const ff = document.getElementById('p-fit');
    if (ff) ff.addEventListener('change', () => { node.fit = ff.value; updateNodeEl(node); });
  }

  if (node.type === 'row' || node.type === 'column') {
    bindPropNum('p-gap', v => { node.gap = Math.max(0, v); updateNodeEl(node); });
  }
  if (node.type === 'wrap') {
    bindPropNum('p-gaph', v => { node.gapH = Math.max(0, v); updateNodeEl(node); });
    bindPropNum('p-gapv', v => { node.gapV = Math.max(0, v); updateNodeEl(node); });
  }

  if (node.type !== 'text') {
    document.querySelectorAll('[data-pickcolor]').forEach(btn => {
      btn.addEventListener('click', () => { node.colorId = btn.dataset.pickcolor || null; updateNodeEl(node); renderProps(); });
    });
    const gotoColors = document.getElementById('p-goto-colors');
    if (gotoColors) gotoColors.addEventListener('click', () => document.querySelector('.mode-tab[data-mode="color"]')?.click());

    bindColor('p-fill', 'p-fill-hex', v => { node.fill = v; updateNodeEl(node); });

    // Fill type (solid / linear / radial) + gradient editor
    document.querySelectorAll('.fill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        node.fillType = btn.dataset.filltype;
        updateNodeEl(node);
        renderProps();
      });
    });
    bindPropNum('p-grad-angle', v => { node.gradient.angle = v; updateNodeEl(node); });
    node.gradient.stops.forEach((stop, i) => {
      const sc = document.querySelector(`[data-stop-color="${i}"]`);
      const sh = document.querySelector(`[data-stop-hex="${i}"]`);
      const sp = document.querySelector(`[data-stop-pos="${i}"]`);
      const sd = document.querySelector(`[data-stop-del="${i}"]`);
      if (sc) sc.addEventListener('input', () => { stop.color = sc.value; if (sh) sh.value = sc.value; updateNodeEl(node); });
      if (sh) sh.addEventListener('input', () => { if (/^#[0-9a-f]{3,8}$/i.test(sh.value)) { stop.color = sh.value; if (sc) sc.value = sh.value; updateNodeEl(node); } });
      if (sp) sp.addEventListener('input', () => { stop.pos = Math.min(100, Math.max(0, parseFloat(sp.value) || 0)); updateNodeEl(node); });
      if (sd) sd.addEventListener('click', () => { if (node.gradient.stops.length > 2) { node.gradient.stops.splice(i, 1); updateNodeEl(node); renderProps(); } });
    });
    const addStop = document.getElementById('p-grad-addstop');
    if (addStop) addStop.addEventListener('click', () => {
      const stops = node.gradient.stops;
      stops.push({ color: stops[stops.length - 1]?.color || '#ffffff', pos: 100 });
      updateNodeEl(node);
      renderProps();
    });

    bindColor('p-stroke', 'p-stroke-hex', v => { node.stroke = v; updateNodeEl(node); });
    document.querySelectorAll('[data-strokecolor]').forEach(btn => {
      btn.addEventListener('click', () => { node.strokeColorId = btn.dataset.strokecolor || null; updateNodeEl(node); renderProps(); });
    });
    bindPropNum('p-strokew', v => { node.strokeW = Math.max(0, v); updateNodeEl(node); });
    bindPropNum('p-stroke-opacity', v => { node.strokeOpacity = Math.min(1, Math.max(0, v / 100)); updateNodeEl(node); });
    const styleBtn = document.getElementById('p-stroke-style-btn');
    const styleMenu = document.getElementById('p-stroke-style-menu');
    if (styleBtn && styleMenu) {
      styleBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = styleMenu.classList.contains('open');
        document.querySelectorAll('.style-menu.open').forEach(m => m.classList.remove('open'));
        if (!wasOpen) {
          const r = styleBtn.getBoundingClientRect();
          styleMenu.style.left = r.left + 'px';
          styleMenu.style.top = (r.bottom + 4) + 'px';
          styleMenu.style.minWidth = r.width + 'px';
          styleMenu.classList.add('open');
        }
      });
      styleMenu.querySelectorAll('[data-sstyle]').forEach(it => {
        it.addEventListener('click', () => { node.strokeStyle = it.dataset.sstyle; updateNodeEl(node); renderProps(); });
      });
    }
  } else {
    const ta = document.getElementById('p-text');
    if (ta) ta.addEventListener('input', () => { node.text = ta.value; updateNodeEl(node); });
    bindPropNum('p-fontsize', v => { node.fontSize = Math.max(1, v); updateNodeEl(node); });
    const fw = document.getElementById('p-fontweight');
    if (fw) fw.addEventListener('change', () => { node.fontWeight = fw.value; updateNodeEl(node); });
    bindColor('p-color', 'p-color-hex', v => { node.color = v; updateNodeEl(node); });
  }

  document.querySelectorAll('[data-ah]').forEach(b => b.addEventListener('click', () => { node.alignment.h = b.dataset.ah; updateNodeEl(node); renderProps(); }));
  document.querySelectorAll('[data-av]').forEach(b => b.addEventListener('click', () => { node.alignment.v = b.dataset.av; updateNodeEl(node); renderProps(); }));
}

// Custom border-style dropdown styled like the frame menu (native <select> is ugly)
function styleDropdown(node) {
  const cur = node.strokeStyle || 'solid';
  return `
    <div class="style-select">
      <button class="prop-input style-trigger" id="p-stroke-style-btn">${cur}<span class="style-caret">&#9662;</span></button>
      <div class="style-menu" id="p-stroke-style-menu">
        ${['solid', 'dashed', 'dotted', 'double'].map(s => `<div class="style-menu-item ${cur === s ? 'active' : ''}" data-sstyle="${s}">${s}</div>`).join('')}
      </div>
    </div>`;
}

// Close any open style dropdown when clicking elsewhere
document.addEventListener('click', e => {
  if (!e.target.closest('.style-select')) {
    document.querySelectorAll('.style-menu.open').forEach(m => m.classList.remove('open'));
  }
});

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
