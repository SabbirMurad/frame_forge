import { state, getNode } from './state.js';
import { noSelection, propsFields, esc } from './utils.js';
import { colorCss } from './colors.js';
import { updateNodeEl, render } from './render.js';
import { renderLayers } from './layers.js';
import { ddTrigger } from './dropdown.js';

const STROKE_STYLES = ['solid', 'dashed', 'dotted', 'double'];
const FIT_OPTIONS = [
  { value: 'cover', label: 'cover' }, { value: 'contain', label: 'contain' },
  { value: 'fill', label: 'fill' }, { value: 'fitWidth', label: 'fit width' },
  { value: 'fitHeight', label: 'fit height' },
];

// All custom dropdowns in the panel route their selection here (one delegated
// listener; the panel rebuilds its innerHTML but #props-fields itself persists).
propsFields.addEventListener('dd:change', e => {
  const node = getNode([...state.selected][0]);
  if (!node) return;
  const v = e.detail.value;
  switch (e.target.dataset.pp) {
    case 'fit': node.fit = v; updateNodeEl(node); break;
    case 'sstyle': node.strokeStyle = v; updateNodeEl(node); renderProps(); break;
  }
});

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
        <input class="prop-input" id="p-w" type="number" value="${Math.round(node.w)}" ${node.type === 'frame' ? 'readonly title="Frame size is fixed"' : (node.type === 'text' && node.autoSize ? 'readonly title="Text size fits its content"' : '')}>
        <span class="prop-label">H</span>
        <input class="prop-input" id="p-h" type="number" value="${Math.round(node.h)}" ${node.type === 'frame' ? 'readonly title="Frame size is fixed"' : (node.type === 'text' && node.autoSize ? 'readonly title="Text size fits its content"' : '')}>
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
    ${node.type === 'container' || node.type === 'row' || node.type === 'column' ? `
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
    ${node.type === 'container' || node.type === 'frame' ? `
    <div class="prop-section">
      <div class="prop-section-title">Padding</div>
      <div class="prop-row">
        <span class="prop-label" title="Top">T</span>
        <input class="prop-input" id="p-pad-t" type="number" value="${node.padding.t}" min="0">
        <span class="prop-label" title="Left">L</span>
        <input class="prop-input" id="p-pad-l" type="number" value="${node.padding.l}" min="0">
      </div>
      <div class="prop-row">
        <span class="prop-label" title="Bottom">B</span>
        <input class="prop-input" id="p-pad-b" type="number" value="${node.padding.b}" min="0">
        <span class="prop-label" title="Right">R</span>
        <input class="prop-input" id="p-pad-r" type="number" value="${node.padding.r}" min="0">
      </div>
    </div>` : ''}
    ${node.type === 'container' ? `
    <div class="prop-section">
      <div class="prop-section-title">Margin</div>
      <div class="prop-row">
        <span class="prop-label" title="Top">T</span>
        <input class="prop-input" id="p-mar-t" type="number" value="${node.margin.t}" min="0">
        <span class="prop-label" title="Left">L</span>
        <input class="prop-input" id="p-mar-l" type="number" value="${node.margin.l}" min="0">
      </div>
      <div class="prop-row">
        <span class="prop-label" title="Bottom">B</span>
        <input class="prop-input" id="p-mar-b" type="number" value="${node.margin.b}" min="0">
        <span class="prop-label" title="Right">R</span>
        <input class="prop-input" id="p-mar-r" type="number" value="${node.margin.r}" min="0">
      </div>
    </div>` : ''}
    ${node.type === 'container' ? `
    <div class="prop-section">
      <div class="prop-section-title">Scroll</div>
      <div class="shape-toggle">
        <button class="shape-btn ${node.scroll === 'horizontal' ? 'active' : ''}" data-scroll="horizontal">Horizontal</button>
        <button class="shape-btn ${node.scroll === 'vertical' ? 'active' : ''}" data-scroll="vertical">Vertical</button>
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
        ${ddTrigger({ value: node.fit || 'cover', options: FIT_OPTIONS, data: { pp: 'fit' }, triggerClass: 'dd-block' })}
      </div>
    </div>` : ''}
    ${node.type === 'frame' || node.type === 'container' || node.type === 'image' ? `
    <div class="prop-section">
      <div class="prop-section-title">Fill</div>
      ${state.colors.length === 0 ? `
      <div class="api-hint" style="margin-bottom:8px">No colors created yet.</div>
      <button class="goto-colors-btn" id="p-goto-colors">+ Create a color</button>` : `
      <div class="color-pick-grid">
        <button class="color-pick none ${!node.colorId ? 'selected' : ''}" data-pickcolor="" title="None"></button>
        ${state.colors.map(c => `<button class="color-pick ${node.colorId === c.id ? 'selected' : ''}" data-pickcolor="${c.id}" title="${esc(c.name)}" style="background:${colorCss(c)}"></button>`).join('')}
      </div>`}
    </div>` : ''}
    ${node.type === 'container' || node.type === 'image' ? `
    <div class="prop-section">
      <div class="prop-section-title">Stroke</div>
      <div class="prop-section-title" style="font-size:11px;text-transform:none;letter-spacing:0;color:var(--text2);margin-bottom:6px">Color</div>
      <div class="color-pick-grid" style="margin-bottom:10px">
        <button class="color-pick none ${!node.strokeColorId ? 'selected' : ''}" data-strokecolor="" title="None"></button>
        ${state.colors.filter(c => c.fillType === 'solid').map(c => `<button class="color-pick ${node.strokeColorId === c.id ? 'selected' : ''}" data-strokecolor="${c.id}" title="${esc(c.name)}" style="background:${colorCss(c)}"></button>`).join('')}
      </div>
      <div class="prop-row">
        <span class="prop-label" style="width:auto">Size</span>
        <input class="prop-input" id="p-strokew" type="number" value="${node.strokeW}" min="0" style="width:50px;flex:0 0 auto">
        <span class="prop-label-wide" style="width:auto">Style</span>
        ${styleDropdown(node)}
      </div>
    </div>` : ''}
    ${node.type === 'text' ? `
    <div class="prop-section">
      <div class="prop-section-title">Text</div>
      <div class="prop-row">
        <textarea class="prop-input" id="p-text" rows="3" style="resize:vertical">${esc(node.text)}</textarea>
      </div>
    </div>
    <div class="prop-section">
      <div class="prop-section-title">Style</div>
      ${state.typography.length === 0 ? `
      <div class="api-hint" style="margin-bottom:8px">No text styles yet.</div>
      <button class="goto-colors-btn" id="p-goto-typo">+ Create a style</button>` : `
      <div class="typo-pick-list">
        <button class="typo-pick ${!node.typoId ? 'selected' : ''}" data-picktypo="">None</button>
        ${state.typography.map(t => `<button class="typo-pick ${node.typoId === t.id ? 'selected' : ''}" data-picktypo="${t.id}" title="${esc(t.name)}">${esc(t.name)}</button>`).join('')}
      </div>`}
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
        render();        // re-render so radius handles appear/disappear with the shape
        renderLayers();
      });
    });
  }

  if (node.type === 'container' || node.type === 'frame') {
    bindPropNum('p-pad-t', v => { node.padding.t = Math.max(0, v); updateNodeEl(node); });
    bindPropNum('p-pad-r', v => { node.padding.r = Math.max(0, v); updateNodeEl(node); });
    bindPropNum('p-pad-b', v => { node.padding.b = Math.max(0, v); updateNodeEl(node); });
    bindPropNum('p-pad-l', v => { node.padding.l = Math.max(0, v); updateNodeEl(node); });
  }

  if (node.type === 'container') {
    bindPropNum('p-mar-t', v => { node.margin.t = Math.max(0, v); updateNodeEl(node); });
    bindPropNum('p-mar-r', v => { node.margin.r = Math.max(0, v); updateNodeEl(node); });
    bindPropNum('p-mar-b', v => { node.margin.b = Math.max(0, v); updateNodeEl(node); });
    bindPropNum('p-mar-l', v => { node.margin.l = Math.max(0, v); updateNodeEl(node); });

    document.querySelectorAll('[data-scroll]').forEach(btn => {
      btn.addEventListener('click', () => {
        // Toggle: clicking the active axis turns scrolling off; otherwise switch
        // to that axis (only one axis can scroll at a time).
        node.scroll = node.scroll === btn.dataset.scroll ? 'none' : btn.dataset.scroll;
        updateNodeEl(node);
        renderProps();
      });
    });
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

    // Stroke color (container/image) is picked from the Color tab's solid colors.
    document.querySelectorAll('[data-strokecolor]').forEach(btn => {
      btn.addEventListener('click', () => { node.strokeColorId = btn.dataset.strokecolor || null; updateNodeEl(node); renderProps(); });
    });
    bindPropNum('p-strokew', v => { node.strokeW = Math.max(0, v); updateNodeEl(node); });
  } else {
    const ta = document.getElementById('p-text');
    if (ta) ta.addEventListener('input', () => { node.text = ta.value; updateNodeEl(node); });
    document.querySelectorAll('[data-picktypo]').forEach(btn => {
      btn.addEventListener('click', () => { node.typoId = btn.dataset.picktypo || null; updateNodeEl(node); renderProps(); });
    });
    const gotoTypo = document.getElementById('p-goto-typo');
    if (gotoTypo) gotoTypo.addEventListener('click', () => document.querySelector('.mode-tab[data-mode="typography"]')?.click());
  }

  document.querySelectorAll('[data-ah]').forEach(b => b.addEventListener('click', () => { node.alignment.h = b.dataset.ah; updateNodeEl(node); renderProps(); }));
  document.querySelectorAll('[data-av]').forEach(b => b.addEventListener('click', () => { node.alignment.v = b.dataset.av; updateNodeEl(node); renderProps(); }));
}

// Border-style picker — the shared custom dropdown (selection handled by the
// delegated dd:change listener above via data-pp="sstyle").
function styleDropdown(node) {
  return ddTrigger({
    value: node.strokeStyle || 'solid',
    options: STROKE_STYLES.map(s => ({ value: s, label: s })),
    data: { pp: 'sstyle' },
    triggerClass: 'dd-block dd-cap',
  });
}

function bindProp(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => fn(el.value));
}

function bindPropNum(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => fn(parseFloat(el.value) || 0));
}
