export const state = {
  nodes: [],
  selected: new Set(),
  tool: 'select',
  zoom: 1,
  panX: 60,
  panY: 60,
  projectName: 'Untitled',
  nextId: 1,
  nextFrameNum: 1,
  nextContainerNum: 1,
  // Color tab: reusable color variables (solid or gradient)
  colors: [],
  nextColorId: 1,
  selectedColorId: null,
  history: [],
  historyIndex: -1,
  // Model tab: data models (entities) with typed properties
  models: [],
  nextModelId: 1,
  nextPropId: 1,
  // API tab: endpoints sharing one base URL
  apis: [],
  apiBaseUrl: '',
  nextApiId: 1,
  nextHeaderId: 1,
};

export function getNode(id) {
  return state.nodes.find(n => n.id === id);
}

export function getColorById(id) {
  return state.colors.find(c => c.id === id);
}

export function makeNode(type, x, y, w, h, parentId = null) {
  const defaults = {
    frame:     { fill: '#ffffff', stroke: 'transparent', strokeW: 0, strokeOpacity: 1, strokeStyle: 'solid', opacity: 1, name: 'Frame' },
    container: { fill: 'transparent', stroke: 'transparent', strokeW: 0, strokeOpacity: 1, strokeStyle: 'solid', opacity: 1, name: 'Container' },
    row:       { fill: 'transparent', stroke: '#c7c7c7', strokeW: 1, strokeOpacity: 1, strokeStyle: 'dashed', opacity: 1, name: 'Row' },
    column:    { fill: 'transparent', stroke: '#c7c7c7', strokeW: 1, strokeOpacity: 1, strokeStyle: 'dashed', opacity: 1, name: 'Column' },
    wrap:      { fill: 'transparent', stroke: '#c7c7c7', strokeW: 1, strokeOpacity: 1, strokeStyle: 'dashed', opacity: 1, name: 'Wrap' },
    stack:     { fill: 'transparent', stroke: '#c7c7c7', strokeW: 1, strokeOpacity: 1, strokeStyle: 'dashed', opacity: 1, name: 'Stack' },
    image:     { fill: 'transparent', stroke: 'transparent', strokeW: 0, strokeOpacity: 1, strokeStyle: 'solid', opacity: 1, name: 'Image' },
    text:      { fill: 'transparent', stroke: 'transparent', strokeW: 0, strokeOpacity: 1, strokeStyle: 'solid', opacity: 1, name: 'Text', text: 'Text', fontSize: 16, fontWeight: '400', color: '#1a1a1a' },
  };
  const d = defaults[type] || defaults.container;
  const node = {
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
    shape: 'rect',
    colorId: null,
    strokeColorId: null,
    fillType: 'solid',
    gradient: {
      angle: 90,
      stops: [
        { color: d.fill && d.fill !== 'transparent' ? d.fill : '#5b8af5', pos: 0 },
        { color: '#ffffff', pos: 100 },
      ],
    },
    src: '',
    fit: 'cover',
    gap: 8,
    gapH: 8,
    gapV: 8,
    text: d.text || '',
    fontSize: d.fontSize || 14,
    fontWeight: d.fontWeight || '400',
    color: d.color || '#000000',
    alignment: { h: 'left', v: 'top' },
  };
  if (type === 'container') node.name = 'Container_' + state.nextContainerNum++;
  return node;
}
