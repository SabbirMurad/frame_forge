import { state } from './state.js';
import { esc } from './utils.js';

// Model tab: define data models (entities) with typed properties.
// A property's type is a tree: primitives are leaves; List/Set wrap one type,
// Map wraps two (key, value). This lets types nest, e.g. Map<String, List<int>>.

const PRIMITIVES = ['String', 'int', 'double', 'bool'];
const COLLECTIONS = ['List', 'Set', 'Map'];

// Build a fresh type subtree for a chosen base, seeding collection args.
function makeType(base) {
  if (base === 'List' || base === 'Set') return { base, args: [makeType('String')] };
  if (base === 'Map') return { base, args: [makeType('String'), makeType('String')] };
  return { base, args: [] };
}

// Render a type tree to a Dart-style string, e.g. "Map<String, List<int>>".
export function typeToString(t) {
  if (!t) return '';
  if (t.base === 'List') return `List<${typeToString(t.args[0])}>`;
  if (t.base === 'Set') return `Set<${typeToString(t.args[0])}>`;
  if (t.base === 'Map') return `Map<${typeToString(t.args[0])}, ${typeToString(t.args[1])}>`;
  return t.base;
}

const getModel = (id) => state.models.find(m => m.id === id);

// Validate a model name against Dart class-name rules (PascalCase identifier).
// Returns a human-readable issue, or null when the name is valid.
function nameError(name) {
  if (!name.trim()) return 'Name can’t be empty';
  if (/^[0-9]/.test(name)) return 'Can’t start with a number';
  if (/\s/.test(name)) return 'No spaces allowed';
  if (/[^A-Za-z0-9]/.test(name)) return 'Only letters and numbers allowed';
  if (!/^[A-Z]/.test(name)) return 'Must be PascalCase (start with a capital letter)';
  return null;
}

// Validate a field name against snake_case rules. Returns an issue, or null.
function fieldNameError(name) {
  if (!name.trim()) return 'Name can’t be empty';
  if (/^[0-9]/.test(name)) return 'Can’t start with a number';
  if (/\s/.test(name)) return 'No spaces allowed';
  if (/[A-Z]/.test(name)) return 'Must be snake_case (use lowercase)';
  if (/[^a-z0-9_]/.test(name)) return 'Only lowercase letters, numbers and underscores';
  return null;
}

// Full validation for a field: name format, then uniqueness within its model.
function propError(model, prop) {
  const fmt = fieldNameError(prop.name);
  if (fmt) return fmt;
  if (model.properties.some(o => o !== prop && o.name.trim() === prop.name.trim())) {
    return 'Duplicate field name';
  }
  return null;
}

// Sync a model's field warning icons + input outlines (no re-render). Renaming
// one field can change another's duplicate status, so refresh them all.
function refreshPropWarns(model) {
  model.properties.forEach(p => {
    const err = propError(model, p);
    const warn = document.querySelector(`.prop-warn[data-pwarn="${p.id}"]`);
    if (warn) { warn.title = err || ''; warn.style.display = err ? '' : 'none'; }
    const input = document.querySelector(`.prop-name-input[data-prop="${p.id}"]`);
    if (input) input.classList.toggle('invalid', !!err);
  });
}

// Names of models that pass all validation — used by the API tab's output picker.
export function validModelNames() {
  return state.models.filter(m => modelError(m) === null).map(m => m.name);
}

// Full validation for a model: name format, then uniqueness across models.
function modelError(m) {
  const fmt = nameError(m.name);
  if (fmt) return fmt;
  if (state.models.some(o => o !== m && o.name.trim() === m.name.trim())) {
    return 'Another model has this name';
  }
  return null;
}

// Sync every card's warning icon + input outline (no re-render). Renaming one
// model can change another's duplicate status, so refresh them all.
function refreshAllWarns() {
  state.models.forEach(m => {
    const err = modelError(m);
    const warn = document.querySelector(`.model-warn[data-warn="${m.id}"]`);
    if (warn) { warn.title = err || ''; warn.style.display = err ? '' : 'none'; }
    const input = document.querySelector(`.model-name-input[data-model="${m.id}"]`);
    if (input) input.classList.toggle('invalid', !!err);
  });
}

function addModel() {
  const n = state.nextModelId++;
  state.models.push({ id: 'm' + n, name: 'Model' + n, properties: [] });
  renderModels();
}

function deleteModel(id) {
  state.models = state.models.filter(m => m.id !== id);
  renderModels();
}

// Pick a free name by stripping any trailing digits and appending the next
// unused number, e.g. "User" → "User2", "User2" → "User3".
function uniqueName(name) {
  const base = name.replace(/\d+$/, '') || name;
  const taken = new Set(state.models.map(m => m.name));
  let n = 2;
  while (taken.has(base + n)) n++;
  return base + n;
}

function duplicateModel(id) {
  const src = getModel(id);
  if (!src) return;
  const clone = JSON.parse(JSON.stringify(src));
  clone.id = 'm' + state.nextModelId++;
  clone.name = uniqueName(src.name);
  clone.properties.forEach(p => { p.id = 'p' + state.nextPropId++; });
  state.models.splice(state.models.indexOf(src) + 1, 0, clone);
  renderModels();
}

function addProperty(model) {
  if (!model) return;
  model.properties.push({ id: 'p' + state.nextPropId++, name: 'field', type: makeType('String'), required: true });
  renderModels();
}

// Toggle a field between required and optional (default is required).
function toggleRequired(model, propId) {
  if (!model) return;
  const p = model.properties.find(p => p.id === propId);
  if (!p) return;
  p.required = !(p.required !== false);
  renderModels();
}

function deleteProperty(model, propId) {
  if (!model) return;
  model.properties = model.properties.filter(p => p.id !== propId);
  renderModels();
}

// Replace the type subtree at `path` (array of arg indices) within a property.
function setTypeAtPath(prop, path, newType) {
  if (path.length === 0) { prop.type = newType; return; }
  let node = prop.type;
  for (let i = 0; i < path.length - 1; i++) node = node.args[path[i]];
  node.args[path[path.length - 1]] = newType;
}

// Recursively render the cascading dropdowns for a type (and its generic args).
function renderTypePicker(t, modelId, propId, path) {
  const modelNames = state.models.map(m => m.name);
  let opts = `<optgroup label="Primitive">${PRIMITIVES.map(o => optTag(o, t.base)).join('')}</optgroup>`;
  opts += `<optgroup label="Collection">${COLLECTIONS.map(o => optTag(o, t.base)).join('')}</optgroup>`;
  if (modelNames.length) {
    opts += `<optgroup label="Models">${modelNames.map(o => optTag(o, t.base)).join('')}</optgroup>`;
  }
  // Keep an unknown base (e.g. a renamed/deleted model reference) selectable.
  const known = [...PRIMITIVES, ...COLLECTIONS, ...modelNames];
  if (!known.includes(t.base)) opts = optTag(t.base, t.base) + opts;

  let html = `<select class="mtype-select" data-model="${modelId}" data-prop="${propId}" data-path="${path.join('.')}">${opts}</select>`;
  if (t.base === 'List' || t.base === 'Set') {
    html += `<span class="mtype-b">&lt;</span>${renderTypePicker(t.args[0], modelId, propId, [...path, 0])}<span class="mtype-b">&gt;</span>`;
  } else if (t.base === 'Map') {
    html += `<span class="mtype-b">&lt;</span>${renderTypePicker(t.args[0], modelId, propId, [...path, 0])}`
          + `<span class="mtype-c">,</span>${renderTypePicker(t.args[1], modelId, propId, [...path, 1])}`
          + `<span class="mtype-b">&gt;</span>`;
  }
  return html;
}

const optTag = (value, selected) =>
  `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`;

function renderCard(m) {
  const props = m.properties.map(p => {
    const perr = propError(m, p);
    const required = p.required !== false;
    return `
    <div class="model-prop">
      <input class="prop-name-input${perr ? ' invalid' : ''}" data-model="${m.id}" data-prop="${p.id}" value="${esc(p.name)}" spellcheck="false" placeholder="name">
      <span class="prop-warn" data-pwarn="${p.id}" title="${perr ? esc(perr) : ''}"${perr ? '' : ' style="display:none"'}>&#9888;</span>
      <div class="prop-type">${renderTypePicker(p.type, m.id, p.id, [])}</div>
      <button class="prop-req ${required ? 'required' : 'optional'}" data-model="${m.id}" data-req-prop="${p.id}" title="${required ? 'Required — click to make optional' : 'Optional — click to make required'}">${required ? 'required' : 'optional'}</button>
      <button class="prop-del" data-model="${m.id}" data-del-prop="${p.id}" title="Remove property">&times;</button>
    </div>`;
  }).join('');

  const err = modelError(m);
  return `
  <div class="model-card">
    <div class="model-card-head">
      <input class="model-name-input${err ? ' invalid' : ''}" data-model="${m.id}" value="${esc(m.name)}" spellcheck="false" placeholder="ModelName">
      <span class="model-warn" data-warn="${m.id}" title="${err ? esc(err) : ''}"${err ? '' : ' style="display:none"'}>&#9888;</span>
      <button class="model-dup" data-dup-model="${m.id}" title="Duplicate model">&#10697;</button>
      <button class="model-del" data-del-model="${m.id}" title="Delete model">&times;</button>
    </div>
    <div class="model-props">${props || ''}</div>
    <button class="prop-add" data-add-prop="${m.id}">+ Add property</button>
  </div>`;
}

export function renderModels() {
  const board = document.getElementById('model-board');
  if (!board) return;
  board.innerHTML = `
    <div class="model-board-head">
      <span class="model-board-title">Models</span>
      <button class="model-add-btn" id="model-new">+ New Model</button>
    </div>
    <div class="model-cards">
      ${state.models.map(renderCard).join('')}
      ${state.models.length === 0 ? `<div class="model-empty">No models yet — click “+ New Model” to create one.</div>` : ''}
    </div>`;
}

export function initModels() {
  const board = document.getElementById('model-board');
  if (!board) return;

  board.addEventListener('click', e => {
    const t = e.target;
    if (t.id === 'model-new') return addModel();
    if (t.dataset.addProp) return addProperty(getModel(t.dataset.addProp));
    if (t.dataset.dupModel) return duplicateModel(t.dataset.dupModel);
    if (t.dataset.delModel) return deleteModel(t.dataset.delModel);
    if (t.dataset.reqProp) return toggleRequired(getModel(t.dataset.model), t.dataset.reqProp);
    if (t.dataset.delProp) return deleteProperty(getModel(t.dataset.model), t.dataset.delProp);
  });

  // Live name edits: update state without re-rendering so focus/caret is kept.
  board.addEventListener('input', e => {
    const t = e.target;
    if (t.classList.contains('model-name-input')) {
      const m = getModel(t.dataset.model); if (m) { m.name = t.value; refreshAllWarns(); }
    } else if (t.classList.contains('prop-name-input')) {
      const m = getModel(t.dataset.model);
      const p = m && m.properties.find(p => p.id === t.dataset.prop);
      if (p) { p.name = t.value; refreshPropWarns(m); }
    }
  });

  board.addEventListener('change', e => {
    const t = e.target;
    if (t.classList.contains('mtype-select')) {
      const m = getModel(t.dataset.model);
      const p = m && m.properties.find(p => p.id === t.dataset.prop);
      if (!p) return;
      const path = t.dataset.path === '' ? [] : t.dataset.path.split('.').map(Number);
      setTypeAtPath(p, path, makeType(t.value));
      return renderModels();
    }
    // Name commit (blur/enter): re-render so other cards' type dropdowns pick up renames.
    if (t.classList.contains('model-name-input')) renderModels();
  });
}
