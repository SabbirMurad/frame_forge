import { state, getNode } from './state.js';
import { layersList, showToast } from './utils.js';
import { isDescendant, reparentNode, canAcceptChild } from './nodes.js';
import { saveHistory } from './history.js';
import { render } from './render.js';

let layerFlatList = [];

export function renderLayers() {
  layersList.innerHTML = '';
  layerFlatList = [];

  function walk(nodeId, depth) {
    const node = getNode(nodeId);
    if (!node) return;
    const el = buildLayerItem(node, depth);
    layersList.appendChild(el);
    layerFlatList.push({ node, depth, el });
    if (node.children && node.children.length) {
      [...node.children].reverse().forEach(cid => walk(cid, depth + 1));
    }
  }

  const roots = [...state.nodes].filter(n => !n.parentId).reverse();
  roots.forEach(n => walk(n.id, 0));
  initLayerDnd();
}

function buildLayerItem(node, depth) {
  const icons = { frame: '\u{1F5BC}', container: '\u25AD', row: '\u2630', column: '\u2637', wrap: '\u25A6', stack: '\u29C9', image: '\u{1F4F7}', text: 'T' };
  const icon = node.type === 'container' && node.shape === 'circle' ? '\u2B24' : (icons[node.type] || '\u25AD');
  const item = document.createElement('div');
  item.className = 'layer-item' +
    (state.selected.has(node.id) ? ' selected' : '') +
    (!node.visible ? ' hidden' : '');
  item.dataset.id = node.id;
  item.draggable = true;

  item.innerHTML = `
    <span class="layer-grip">\u2807</span>
    <div class="layer-indent" style="padding-left:${depth * 14}px;display:flex;align-items:center;gap:6px;flex:1;overflow:hidden">
      <span class="layer-icon">${icon}</span>
      <span class="layer-name">${node.name}</span>
    </div>
    <span class="layer-vis" title="Toggle visibility">${node.visible ? '\u{1F441}' : '\u{1F512}'}</span>
  `;

  item.addEventListener('click', (e) => {
    if (e.target.classList.contains('layer-vis')) {
      node.visible = !node.visible;
      render();
      return;
    }
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      if (state.selected.has(node.id)) state.selected.delete(node.id);
      else state.selected.add(node.id);
    } else {
      state.selected.clear();
      state.selected.add(node.id);
    }
    render();
  });

  return item;
}

// Layer drag-and-drop
let layerDrag = null;
let containerDndInit = false;

function initLayerDnd() {
  layerFlatList.forEach(({ node, el }) => {
    el.addEventListener('dragstart', e => {
      layerDrag = { nodeId: node.id };
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', node.id);
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      clearLayerDndUI();
      layerDrag = null;
    });

    el.addEventListener('dragover', e => {
      e.preventDefault();
      if (!layerDrag || layerDrag.nodeId === node.id) return;
      if (isDescendant(node.id, layerDrag.nodeId)) return;
      clearLayerDndUI();
      const zone = getDndZone(e, el, node);
      el.classList.add(zone === 'into' ? 'drag-into' : zone === 'above' ? 'drag-above' : 'drag-below');
      e.dataTransfer.dropEffect = 'move';
    });

    // Only clear when the cursor actually leaves the item (not when crossing its child spans)
    el.addEventListener('dragleave', e => {
      if (!el.contains(e.relatedTarget)) {
        el.classList.remove('drag-above', 'drag-below', 'drag-into');
      }
    });

    el.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation(); // prevent the list-level "move to root" handler from also firing
      if (!layerDrag || layerDrag.nodeId === node.id) return;
      if (isDescendant(node.id, layerDrag.nodeId)) return;
      const srcNode = getNode(layerDrag.nodeId);
      if (!srcNode) return;
      const zone = getDndZone(e, el, node);
      clearLayerDndUI();
      applyLayerDrop(srcNode, node, zone);
    });
  });

  // Attach the list-level listeners once — layersList persists across renders,
  // so re-adding them every renderLayers() would stack duplicate handlers.
  if (!containerDndInit) {
    containerDndInit = true;
    layersList.addEventListener('dragover', e => { e.preventDefault(); });
    layersList.addEventListener('drop', e => {
      e.preventDefault();
      if (e.target !== layersList) return; // only handle drops on empty list area
      if (!layerDrag) return;
      const srcNode = getNode(layerDrag.nodeId);
      if (!srcNode) return;
      reparentNode(srcNode, null);
      const i = state.nodes.findIndex(n => n.id === srcNode.id);
      if (i !== -1) { state.nodes.splice(i, 1); state.nodes.unshift(srcNode); }
      saveHistory();
      render();
    });
  }
}

function getDndZone(e, el, targetNode) {
  const rect = el.getBoundingClientRect();
  const relY = e.clientY - rect.top;
  const pct = relY / rect.height;
  const draggedId = layerDrag ? layerDrag.nodeId : null;
  if (canAcceptChild(targetNode, draggedId)) {
    if (pct < 0.25) return 'above';
    if (pct > 0.75) return 'below';
    return 'into';
  }
  return pct < 0.5 ? 'above' : 'below';
}

function clearLayerDndUI() {
  layerFlatList.forEach(({ el }) => {
    el.classList.remove('drag-above', 'drag-below', 'drag-into');
  });
}

function applyLayerDrop(srcNode, targetNode, zone) {
  if (zone === 'into' && canAcceptChild(targetNode, srcNode.id)) {
    // reparentNode positions the child per parent type (pinned for frame/container)
    reparentNode(srcNode, targetNode.id);
    targetNode.children = targetNode.children.filter(id => id !== srcNode.id);
    targetNode.children.push(srcNode.id);
  } else {
    const newParentId = targetNode.parentId || null;
    reparentNode(srcNode, newParentId);

    if (newParentId) {
      const parent = getNode(newParentId);
      const children = parent.children.filter(id => id !== srcNode.id);
      const tIdx = children.indexOf(targetNode.id);
      if (zone === 'above') children.splice(tIdx + 1, 0, srcNode.id);
      else children.splice(tIdx, 0, srcNode.id);
      parent.children = children;
    } else {
      const nodesWithoutSrc = state.nodes.filter(n => n.id !== srcNode.id);
      const tIdx = nodesWithoutSrc.findIndex(n => n.id === targetNode.id);
      if (zone === 'above') nodesWithoutSrc.splice(tIdx + 1, 0, srcNode);
      else nodesWithoutSrc.splice(tIdx, 0, srcNode);
      state.nodes = nodesWithoutSrc;
    }
  }

  saveHistory();
  render();
  showToast(zone === 'into' ? `Moved into "${targetNode.name}"` : 'Reordered');
}
