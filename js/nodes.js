import { state, getNode } from './state.js';

export function canvasToWorld(cx, cy) {
  return {
    x: (cx - state.panX) / state.zoom,
    y: (cy - state.panY) / state.zoom,
  };
}

export function getWorldPos(node) {
  let x = node.x, y = node.y;
  let cur = node;
  while (cur.parentId) {
    const parent = getNode(cur.parentId);
    if (!parent) break;
    x += parent.x;
    y += parent.y;
    cur = parent;
  }
  return { x, y };
}

export function isDescendant(nodeId, ancestorId) {
  if (!ancestorId) return false;
  let cur = getNode(nodeId);
  while (cur && cur.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = getNode(cur.parentId);
  }
  return false;
}

export function findFrameAt(wx, wy, excludeId = null) {
  const frames = [...state.nodes].reverse().filter(n =>
    n.type === 'frame' && n.id !== excludeId && !isDescendant(n.id, excludeId)
  );
  for (const frame of frames) {
    const wp = getWorldPos(frame);
    if (wx >= wp.x && wx <= wp.x + frame.w && wy >= wp.y && wy <= wp.y + frame.h) {
      return frame;
    }
  }
  return null;
}

export function reparentNode(node, newParentId) {
  const oldParentId = node.parentId;
  if (oldParentId === newParentId) return;

  const wp = getWorldPos(node);

  if (oldParentId) {
    const oldParent = getNode(oldParentId);
    if (oldParent) oldParent.children = oldParent.children.filter(id => id !== node.id);
  }

  node.parentId = newParentId || null;
  if (newParentId) {
    const newParent = getNode(newParentId);
    if (newParent) {
      if (!newParent.children.includes(node.id)) newParent.children.push(node.id);
      const newWp = getWorldPos(newParent);
      node.x = wp.x - newWp.x;
      node.y = wp.y - newWp.y;
    }
  } else {
    node.x = wp.x;
    node.y = wp.y;
  }
}

export function clearDropTargets() {
  document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
}

export function highlightDropTarget(worldX, worldY, excludeId = null) {
  clearDropTargets();
  const frame = findFrameAt(worldX, worldY, excludeId);
  if (frame) {
    const el = document.getElementById('node-' + frame.id);
    if (el) el.classList.add('drop-target');
  }
}
