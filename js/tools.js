import { state, getNode } from './state.js';
import { canvasWrap } from './utils.js';
import { render, updateNodeEl, zoomAt, fitView } from './render.js';
import { renderProps } from './props.js';
import { undo, redo } from './history.js';
import { deleteSelected, duplicateSelected, groupSelected, ungroupSelected, bringToFront, sendToBack } from './operations.js';

// Tool to restore after a temporary space-bar pan (null = not space-panning)
let spacePanPrev = null;

export function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll('.tool-btn[data-tool]').forEach(b =>
    b.classList.toggle('active', b.dataset.tool === tool)
  );
  canvasWrap.style.cursor = tool === 'hand' ? 'grab' : (tool === 'select' ? 'default' : 'crosshair');
}

export function initToolEvents() {
  // Tool buttons
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  // Toolbar actions
  document.getElementById('btn-group').addEventListener('click', groupSelected);
  document.getElementById('btn-ungroup').addEventListener('click', ungroupSelected);
  document.getElementById('btn-front').addEventListener('click', bringToFront);
  document.getElementById('btn-back').addEventListener('click', sendToBack);

  // Zoom buttons
  document.getElementById('btn-zoom-in').addEventListener('click', () => zoomAt(1.25));
  document.getElementById('btn-zoom-out').addEventListener('click', () => zoomAt(0.8));
  document.getElementById('btn-fit').addEventListener('click', fitView);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    // Design shortcuts (tools, delete, group, zoom…) only apply in the Design tab
    if (!document.body.classList.contains('design-mode')) return;

    // Hold space → temporary hand/pan tool
    if (e.code === 'Space') {
      e.preventDefault();
      if (spacePanPrev === null && state.tool !== 'hand') {
        spacePanPrev = state.tool;
        setTool('hand');
      }
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'g' && !e.shiftKey) { e.preventDefault(); groupSelected(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'G') { e.preventDefault(); ungroupSelected(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') { e.preventDefault(); state.nodes.forEach(n => state.selected.add(n.id)); render(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); return; }
    if (e.key === 'Escape') { state.selected.clear(); setTool('select'); render(); return; }
    if (e.key === 'v' || e.key === 'V') setTool('select');
    if (e.key === 'h' || e.key === 'H') setTool('hand');
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); document.getElementById('tool-frame').click(); }
    if (e.key === 'r' || e.key === 'R') setTool('container');
    if (e.key === 't' || e.key === 'T') setTool('text');
    if (e.key === '0') fitView();
    if (e.key === '+' || e.key === '=') zoomAt(1.25);
    if (e.key === '-') zoomAt(0.8);

    // Arrow nudge
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const d = e.shiftKey ? 10 : 1;
      state.selected.forEach(id => {
        const n = getNode(id);
        if (!n) return;
        if (e.key === 'ArrowUp') n.y -= d;
        if (e.key === 'ArrowDown') n.y += d;
        if (e.key === 'ArrowLeft') n.x -= d;
        if (e.key === 'ArrowRight') n.x += d;
        updateNodeEl(n);
      });
      renderProps();
    }
  });

  // Release space → restore the tool that was active before space-panning
  document.addEventListener('keyup', e => {
    if (e.code === 'Space' && spacePanPrev !== null) {
      setTool(spacePanPrev);
      spacePanPrev = null;
    }
  });

  // Safety: if focus is lost while space is held, restore the tool
  window.addEventListener('blur', () => {
    if (spacePanPrev !== null) {
      setTool(spacePanPrev);
      spacePanPrev = null;
    }
  });
}
