import { state, getNode, makeNode } from './state.js';
import { showToast } from './utils.js';
import { saveHistory } from './history.js';
import { render } from './render.js';

export function deleteSelected() {
  const toDelete = new Set();
  function collectDescendants(id) {
    toDelete.add(id);
    const n = getNode(id);
    if (n && n.children) n.children.forEach(collectDescendants);
  }
  state.selected.forEach(collectDescendants);

  toDelete.forEach(id => {
    const n = getNode(id);
    if (n && n.parentId) {
      const parent = getNode(n.parentId);
      if (parent) parent.children = parent.children.filter(c => c !== id);
    }
  });

  state.nodes = state.nodes.filter(n => !toDelete.has(n.id));
  state.selected.clear();
  saveHistory();
  render();
}

export function duplicateSelected() {
  const newSel = new Set();
  state.selected.forEach(id => {
    const n = getNode(id);
    if (!n) return;
    const clone = JSON.parse(JSON.stringify(n));
    clone.id = 'n' + (state.nextId++);
    clone.x += 20; clone.y += 20;
    clone.name += ' copy';
    clone.children = [];
    state.nodes.push(clone);
    if (clone.parentId) {
      const parent = getNode(clone.parentId);
      if (parent) parent.children.push(clone.id);
    }
    newSel.add(clone.id);
  });
  state.selected = newSel;
  saveHistory();
  render();
}

export function groupSelected() {
  if (state.selected.size < 2) { showToast('Select 2+ elements to group'); return; }
  const ids = [...state.selected];
  const nodes = ids.map(id => getNode(id)).filter(Boolean);
  const minX = Math.min(...nodes.map(n => n.x));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxX = Math.max(...nodes.map(n => n.x + n.w));
  const maxY = Math.max(...nodes.map(n => n.y + n.h));
  const group = makeNode('frame', minX - 8, minY - 8, maxX - minX + 16, maxY - minY + 16);
  group.name = 'Group';
  group.fill = 'transparent';
  group.stroke = '#888';
  group.strokeW = 1;
  group.children = ids;
  nodes.forEach(n => { n.parentId = group.id; n.x -= group.x; n.y -= group.y; });
  ids.forEach(id => { const i = state.nodes.findIndex(n => n.id === id); if (i !== -1) state.nodes.splice(i, 1); });
  state.nodes.push(...nodes);
  state.nodes.push(group);
  state.selected.clear();
  state.selected.add(group.id);
  saveHistory();
  render();
  showToast('Grouped ' + ids.length + ' elements');
}

export function ungroupSelected() {
  state.selected.forEach(id => {
    const group = getNode(id);
    if (!group || !group.children.length) return;
    group.children.forEach(cid => {
      const c = getNode(cid);
      if (c) { c.x += group.x; c.y += group.y; c.parentId = null; }
    });
    const gi = state.nodes.findIndex(n => n.id === id);
    if (gi !== -1) state.nodes.splice(gi, 1);
  });
  state.selected.clear();
  saveHistory();
  render();
  showToast('Ungrouped');
}

export function bringToFront() {
  state.selected.forEach(id => {
    const i = state.nodes.findIndex(n => n.id === id);
    if (i !== -1) { const [n] = state.nodes.splice(i, 1); state.nodes.push(n); }
  });
  render();
}

export function sendToBack() {
  state.selected.forEach(id => {
    const i = state.nodes.findIndex(n => n.id === id);
    if (i !== -1) { const [n] = state.nodes.splice(i, 1); state.nodes.unshift(n); }
  });
  render();
}
