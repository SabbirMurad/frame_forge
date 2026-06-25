import { state, getNode, makeNode } from './state.js';
import { canvasWrap, selBox, closeMenus, ctxMenu, showToast } from './utils.js';
import { canvasToWorld, getWorldPos, findFrameAt, reparentNode, clearDropTargets, highlightDropTarget, SINGLE_CHILD_TYPES } from './nodes.js';
import { saveHistory } from './history.js';
import { render, updateNodeEl, applyTransform } from './render.js';
import { renderProps } from './props.js';
import { setTool } from './tools.js';
import { duplicateSelected, groupSelected, deleteSelected, bringToFront, sendToBack } from './operations.js';

let dragging = null;
let resizing = null;
let panning = false;
let panStart = null;
let drawStart = null;
let selStart = null;

export function attachNodeEvents(el, node) {
  el.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('handle')) {
      e.stopPropagation();
      resizing = {
        node,
        handle: e.target.dataset.handle,
        startX: e.clientX,
        startY: e.clientY,
        origX: node.x, origY: node.y,
        origW: node.w, origH: node.h,
      };
      return;
    }

    if (!['select', 'hand'].includes(state.tool)) return;
    if (node.locked) return;
    e.stopPropagation();

    if (state.tool === 'select') {
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey && !state.selected.has(node.id)) {
        state.selected.clear();
      }
      state.selected.add(node.id);
      render();

      dragging = {
        node,
        startX: e.clientX,
        startY: e.clientY,
        origX: node.x,
        origY: node.y,
        multi: state.selected.size > 1 ? [...state.selected].map(id => {
          const n = getNode(id);
          return n ? { node: n, ox: n.x, oy: n.y } : null;
        }).filter(Boolean) : null,
      };
      saveHistory();
    }
  });
}

function onWrapMouseDown(e) {
  closeMenus();

  if (e.button === 1 || state.tool === 'hand') {
    panning = true;
    panStart = { x: e.clientX, y: e.clientY, px: state.panX, py: state.panY };
    canvasWrap.style.cursor = 'grabbing';
    e.preventDefault();
    return;
  }

  const wrapRect = canvasWrap.getBoundingClientRect();
  const cx = e.clientX - wrapRect.left;
  const cy = e.clientY - wrapRect.top;
  const world = canvasToWorld(cx, cy);

  if (['container', 'text'].includes(state.tool)) {
    drawStart = { cx, cy, x: world.x, y: world.y };
    e.preventDefault();
    return;
  }

  if (state.tool === 'select') {
    const clickedNode = e.target.closest('.node');
    if (!clickedNode) {
      state.selected.clear();
      render();
      selStart = { x: cx, y: cy };
      selBox.style.display = 'block';
      selBox.style.left = cx + 'px';
      selBox.style.top = cy + 'px';
      selBox.style.width = '0';
      selBox.style.height = '0';
    }
  }
}

function onWrapMouseMove(e) {
  if (panning && panStart) {
    state.panX = panStart.px + (e.clientX - panStart.x);
    state.panY = panStart.py + (e.clientY - panStart.y);
    applyTransform();
    return;
  }

  if (resizing) {
    const dx = (e.clientX - resizing.startX) / state.zoom;
    const dy = (e.clientY - resizing.startY) / state.zoom;
    const n = resizing.node;
    const h = resizing.handle;
    let { origX: x, origY: y, origW: w, origH: h2 } = resizing;

    if (h.includes('e')) w = Math.max(10, resizing.origW + dx);
    if (h.includes('s')) h2 = Math.max(10, resizing.origH + dy);
    if (h.includes('w')) { x = resizing.origX + dx; w = Math.max(10, resizing.origW - dx); }
    if (h.includes('n')) { y = resizing.origY + dy; h2 = Math.max(10, resizing.origH - dy); }

    n.x = x; n.y = y; n.w = w; n.h = h2;
    updateNodeEl(n);
    renderProps();
    return;
  }

  if (dragging) {
    const dx = (e.clientX - dragging.startX) / state.zoom;
    const dy = (e.clientY - dragging.startY) / state.zoom;
    if (dragging.multi) {
      dragging.multi.forEach(({ node: n, ox, oy }) => {
        n.x = ox + dx; n.y = oy + dy; updateNodeEl(n);
        document.getElementById('node-' + n.id)?.classList.add('drag-source');
      });
    } else {
      dragging.node.x = dragging.origX + dx;
      dragging.node.y = dragging.origY + dy;
      updateNodeEl(dragging.node);
      document.getElementById('node-' + dragging.node.id)?.classList.add('drag-source');
      const wp = getWorldPos(dragging.node);
      highlightDropTarget(wp.x + dragging.node.w / 2, wp.y + dragging.node.h / 2, dragging.node.id);
    }
    renderProps();
    return;
  }

  if (selStart) {
    const rect = canvasWrap.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const sx = Math.min(selStart.x, cx);
    const sy = Math.min(selStart.y, cy);
    const sw = Math.abs(cx - selStart.x);
    const sh = Math.abs(cy - selStart.y);
    selBox.style.left = sx + 'px';
    selBox.style.top = sy + 'px';
    selBox.style.width = sw + 'px';
    selBox.style.height = sh + 'px';
    return;
  }

  if (drawStart) {
    const rect = canvasWrap.getBoundingClientRect();
    const wx = e.clientX - rect.left;
    const wy = e.clientY - rect.top;
    const world = canvasToWorld(wx, wy);
    if (state.tool !== 'frame') highlightDropTarget(world.x, world.y);
    return;
  }
}

function onWrapMouseUp(e) {
  clearDropTargets();

  if (panning) {
    panning = false;
    canvasWrap.style.cursor = state.tool === 'hand' ? 'grab' : 'default';
    return;
  }

  if (resizing) { resizing = null; saveHistory(); render(); return; }

  if (dragging) {
    if (!dragging.multi) {
      const n = dragging.node;
      const wp = getWorldPos(n);
      const centerX = wp.x + n.w / 2;
      const centerY = wp.y + n.h / 2;
      const targetFrame = findFrameAt(centerX, centerY, n.id);
      const targetId = targetFrame ? targetFrame.id : null;
      if (targetId !== n.parentId) {
        reparentNode(n, targetId);
        showToast(targetFrame ? `Moved into "${targetFrame.name}"` : 'Moved to canvas');
      } else if (n.parentId) {
        // Stayed in the same parent: a single-child wrapper keeps its child pinned top-left
        const parent = getNode(n.parentId);
        if (parent && SINGLE_CHILD_TYPES.includes(parent.type)) { n.x = 0; n.y = 0; }
      }
    }
    dragging = null;
    saveHistory();
    render();
    return;
  }

  if (selStart) {
    selBox.style.display = 'none';
    const rect = canvasWrap.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const sx = Math.min(selStart.x, cx);
    const sy = Math.min(selStart.y, cy);
    const sw = Math.abs(cx - selStart.x);
    const sh = Math.abs(cy - selStart.y);
    if (sw > 4 && sh > 4) {
      const w1 = canvasToWorld(sx, sy);
      const w2 = canvasToWorld(sx + sw, sy + sh);
      state.nodes.forEach(n => {
        if (n.x < w2.x && n.x + n.w > w1.x && n.y < w2.y && n.y + n.h > w1.y) {
          state.selected.add(n.id);
        }
      });
      render();
    }
    selStart = null;
    return;
  }

  if (drawStart) {
    const rect = canvasWrap.getBoundingClientRect();
    const wx = e.clientX - rect.left;
    const wy = e.clientY - rect.top;
    const world = canvasToWorld(wx, wy);

    const worldX = Math.min(drawStart.x, world.x);
    const worldY = Math.min(drawStart.y, world.y);
    const w = Math.max(10, Math.abs(world.x - drawStart.x));
    const h = Math.max(10, Math.abs(world.y - drawStart.y));

    const midX = (drawStart.x + world.x) / 2;
    const midY = (drawStart.y + world.y) / 2;
    const parentFrame = state.tool !== 'frame' ? findFrameAt(midX, midY) : null;

    let localX = worldX, localY = worldY;
    if (parentFrame) {
      if (SINGLE_CHILD_TYPES.includes(parentFrame.type)) {
        // Single-child wrappers pin their child to the top-left corner
        localX = 0;
        localY = 0;
      } else {
        const pp = getWorldPos(parentFrame);
        localX = worldX - pp.x;
        localY = worldY - pp.y;
      }
    }

    const node = makeNode(state.tool, localX, localY, w, h, parentFrame ? parentFrame.id : null);
    if (parentFrame) {
      parentFrame.children.push(node.id);
    }
    state.nodes.push(node);
    state.selected.clear();
    state.selected.add(node.id);
    setTool('select');
    saveHistory();
    render();
    drawStart = null;
    return;
  }
}

function onWheel(e) {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = canvasWrap.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const wx = (cx - state.panX) / state.zoom;
    const wy = (cy - state.panY) / state.zoom;
    state.zoom = Math.min(8, Math.max(0.05, state.zoom * factor));
    state.panX = cx - wx * state.zoom;
    state.panY = cy - wy * state.zoom;
  } else {
    state.panX -= e.deltaX;
    state.panY -= e.deltaY;
  }
  applyTransform();
}

function onDblClick(e) {
  const nodeEl = e.target.closest('.node');
  if (!nodeEl) return;
  const node = getNode(nodeEl.dataset.id);
  if (!node || node.type !== 'text') return;
  startTextEdit(node, nodeEl);
}

function startTextEdit(node, el) {
  const ta = document.createElement('textarea');
  ta.className = 'text-editor';
  ta.value = node.text;
  ta.style.left = '0'; ta.style.top = '0';
  ta.style.width = node.w + 'px'; ta.style.height = node.h + 'px';
  ta.style.fontSize = node.fontSize + 'px';
  ta.style.fontWeight = node.fontWeight;
  ta.style.color = node.color;
  el.textContent = '';
  el.appendChild(ta);
  ta.focus();
  ta.select();
  ta.addEventListener('input', () => { node.text = ta.value; });
  ta.addEventListener('blur', () => { node.text = ta.value; render(); });
  ta.addEventListener('keydown', e => { if (e.key === 'Escape') { node.text = ta.value; render(); } });
}

function onContextMenu(e) {
  e.preventDefault();
  const nodeEl = e.target.closest('.node');
  if (nodeEl) {
    const node = getNode(nodeEl.dataset.id);
    if (node && !state.selected.has(node.id)) {
      state.selected.clear();
      state.selected.add(node.id);
      render();
    }
  }
  ctxMenu.style.left = e.clientX + 'px';
  ctxMenu.style.top = e.clientY + 'px';
  ctxMenu.style.display = 'block';
}

export function initCanvasEvents() {
  // Suppress the browser's native right-click menu everywhere, in every tab.
  document.addEventListener('contextmenu', e => e.preventDefault());

  // Canvas interaction (select/drag/pan/zoom/context-menu) is design-only;
  // the model board shares #canvas-wrap, so skip these in other modes.
  const designOnly = (fn) => (e) => { if (document.body.classList.contains('design-mode')) fn(e); };
  canvasWrap.addEventListener('mousedown', designOnly(onWrapMouseDown), true);
  canvasWrap.addEventListener('mousemove', designOnly(onWrapMouseMove));
  canvasWrap.addEventListener('mouseup', designOnly(onWrapMouseUp));
  canvasWrap.addEventListener('wheel', designOnly(onWheel), { passive: false });
  canvasWrap.addEventListener('contextmenu', designOnly(onContextMenu));
  canvasWrap.addEventListener('dblclick', designOnly(onDblClick));

  // Context menu actions
  ctxMenu.addEventListener('click', e => {
    const item = e.target.closest('.ctx-item');
    if (!item) return;
    const action = item.dataset.action;
    if (action === 'duplicate') duplicateSelected();
    if (action === 'group') groupSelected();
    if (action === 'delete') deleteSelected();
    if (action === 'front') bringToFront();
    if (action === 'back') sendToBack();
    closeMenus();
  });

  // Close menus on outside click
  document.addEventListener('click', e => {
    if (!ctxMenu.contains(e.target)) ctxMenu.style.display = 'none';
    const addMenu = document.getElementById('add-menu');
    if (!addMenu.contains(e.target) && e.target.id !== 'btn-add-layer') addMenu.style.display = 'none';
    const frameMenu = document.getElementById('frame-menu');
    if (!frameMenu.contains(e.target) && !e.target.closest('#tool-frame')) frameMenu.style.display = 'none';
  });
}
