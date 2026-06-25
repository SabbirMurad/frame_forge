import { state, getNode } from './state.js';

// Types that can contain children (valid drop targets)
export const CONTAINER_TYPES = ['frame', 'container', 'row', 'column', 'wrap', 'stack'];
// Wrappers that hold exactly one child; the rest are multi-child layouts
export const SINGLE_CHILD_TYPES = ['frame', 'container'];
// Multi-child layout types (row/column/wrap are flex, stack is absolute)
export const MULTI_CHILD_TYPES = ['row', 'column', 'wrap', 'stack'];

// Whether `node` can accept `childId` as a child right now.
// Multi-child layouts always can; single-child wrappers only if empty
// (ignoring childId itself, so an existing child can be re-dropped/moved within).
export function canAcceptChild(node, childId = null) {
  if (!node || !CONTAINER_TYPES.includes(node.type)) return false;
  if (!SINGLE_CHILD_TYPES.includes(node.type)) return true;
  const kids = (node.children || []).filter(id => id !== childId);
  return kids.length === 0;
}

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
    n.id !== excludeId && !isDescendant(n.id, excludeId) && canAcceptChild(n, excludeId)
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
      if (SINGLE_CHILD_TYPES.includes(newParent.type)) {
        // Single-child wrappers pin their child to the top-left corner
        node.x = 0;
        node.y = 0;
      } else {
        const newWp = getWorldPos(newParent);
        node.x = wp.x - newWp.x;
        node.y = wp.y - newWp.y;
      }
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
