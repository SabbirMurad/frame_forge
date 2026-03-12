export const state = {
  nodes: [],
  selected: new Set(),
  tool: 'select',
  zoom: 1,
  panX: 60,
  panY: 60,
  nextId: 1,
  history: [],
  historyIndex: -1,
};

export function getNode(id) {
  return state.nodes.find(n => n.id === id);
}

export function makeNode(type, x, y, w, h, parentId = null) {
  const defaults = {
    frame:   { fill: '#ffffff', stroke: '#cccccc', strokeW: 1, strokeOpacity: 1, strokeStyle: 'solid', opacity: 1, name: 'Frame' },
    rect:    { fill: '#5b8af5', stroke: 'transparent', strokeW: 0, strokeOpacity: 1, strokeStyle: 'solid', opacity: 1, name: 'Rectangle' },
    ellipse: { fill: '#f55b8a', stroke: 'transparent', strokeW: 0, strokeOpacity: 1, strokeStyle: 'solid', opacity: 1, name: 'Ellipse' },
    text:    { fill: 'transparent', stroke: 'transparent', strokeW: 0, strokeOpacity: 1, strokeStyle: 'solid', opacity: 1, name: 'Text', text: 'Text', fontSize: 16, fontWeight: '400', color: '#1a1a1a' },
  };
  const d = defaults[type] || defaults.rect;
  return {
    id: 'n' + (state.nextId++),
    type, x, y, w, h, parentId,
    children: [],
    visible: true,
    locked: false,
    name: d.name,
    fill: d.fill,
    stroke: d.stroke,
    strokeW: d.strokeW,
    strokeOpacity: d.strokeOpacity,
    strokeStyle: d.strokeStyle,
    opacity: d.opacity,
    radius: 0,
    text: d.text || '',
    fontSize: d.fontSize || 14,
    fontWeight: d.fontWeight || '400',
    color: d.color || '#000000',
    constraints: { h: 'left', v: 'top' },
  };
}
