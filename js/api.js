import { state } from './state.js';
import { esc } from './utils.js';
import { validModelNames } from './models.js';
import { ddTrigger } from './dropdown.js';
import { saveHistory } from './history.js';

// API tab: REST endpoints that share one base URL. Each endpoint has a method,
// version + route (appended to the base URL), headers, an optional body (only
// for body-bearing methods), and an output that references a valid model.

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const BODY_METHODS = ['POST', 'PUT', 'PATCH'];

const getApi = (id) => state.apis.find(a => a.id === id);
const getHeader = (api, id) => api && api.headers.find(h => h.id === id);
const getParam = (api, id) => api && (api.params || []).find(p => p.id === id);

// Join base URL + version + route into one path (trimming stray slashes), then
// append any query parameters as ?key=value&…
function fullUrl(api) {
  const path = [state.apiBaseUrl, api.version, api.route]
    .map(s => (s || '').trim().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  const qs = (api.params || [])
    .filter(p => p.key.trim())
    .map(p => `${p.key.trim()}=${p.value.trim()}`)
    .join('&');
  return qs ? `${path}?${qs}` : path;
}

function outputStr(api) {
  if (!api.output.model) return '—';
  return api.output.type === 'list' ? `List<${api.output.model}>` : api.output.model;
}

function addApi() {
  state.apis.push({
    id: 'a' + state.nextApiId++,
    method: 'GET', version: 'v1', route: '',
    params: [], headers: [], body: '',
    output: { type: 'single', model: '' },
  });
  saveHistory();
  renderApi();
}

function delApi(id) {
  state.apis = state.apis.filter(a => a.id !== id);
  saveHistory();
  renderApi();
}

function addHeader(api) {
  if (!api) return;
  api.headers.push({ id: 'h' + state.nextHeaderId++, key: '', value: '' });
  saveHistory();
  renderApi();
}

function delHeader(api, id) {
  if (!api) return;
  api.headers = api.headers.filter(h => h.id !== id);
  saveHistory();
  renderApi();
}

function addParam(api) {
  if (!api) return;
  if (!api.params) api.params = [];
  api.params.push({ id: 'q' + state.nextParamId++, key: '', value: '' });
  saveHistory();
  renderApi();
}

function delParam(api, id) {
  if (!api) return;
  api.params = (api.params || []).filter(p => p.id !== id);
  saveHistory();
  renderApi();
}

// Live-refresh a card's URL preview without a full re-render.
function updateUrl(api) {
  const el = document.querySelector(`[data-url="${api.id}"]`);
  if (!el) return;
  const u = fullUrl(api);
  el.innerHTML = u ? esc(u) : '<span class="api-url-empty">set base URL &amp; route</span>';
}

function renderApiCard(api) {
  const models = validModelNames();
  const hasBody = BODY_METHODS.includes(api.method);

  const headerRows = api.headers.map(h => `
    <div class="api-header-row">
      <input class="api-h-key" data-api="${api.id}" data-h="${h.id}" value="${esc(h.key)}" spellcheck="false" placeholder="Header">
      <input class="api-h-val" data-api="${api.id}" data-h="${h.id}" value="${esc(h.value)}" spellcheck="false" placeholder="Value">
      <button class="prop-del" data-api="${api.id}" data-del-h="${h.id}" title="Remove header">&times;</button>
    </div>`).join('');

  const paramRows = (api.params || []).map(p => `
    <div class="api-header-row">
      <input class="api-p-key" data-api="${api.id}" data-p="${p.id}" value="${esc(p.key)}" spellcheck="false" placeholder="Key">
      <input class="api-p-val" data-api="${api.id}" data-p="${p.id}" value="${esc(p.value)}" spellcheck="false" placeholder="Value">
      <button class="prop-del" data-api="${api.id}" data-del-p="${p.id}" title="Remove parameter">&times;</button>
    </div>`).join('');

  // Output model options: none + valid models, keeping a now-invalid/deleted
  // selection visible & flagged rather than silently dropping it.
  const modelOptions = [
    { value: '', label: '— none —' },
    ...models.map(nm => ({ value: nm, label: nm })),
  ];
  if (api.output.model && !models.includes(api.output.model)) {
    modelOptions.push({ value: api.output.model, label: '⚠ ' + api.output.model });
  }

  const methodDD = ddTrigger({
    value: api.method,
    options: METHODS.map(m => ({ value: m, label: m, cls: `method-${m}` })),
    data: { api: api.id, field: 'method' },
    triggerClass: 'dd-method',
    labelCls: `method-${api.method}`,
  });
  const outTypeDD = ddTrigger({
    value: api.output.type,
    options: [{ value: 'single', label: 'Model' }, { value: 'list', label: 'List<Model>' }],
    data: { api: api.id, field: 'outType' },
  });
  const outModelDD = ddTrigger({
    value: api.output.model,
    options: modelOptions,
    data: { api: api.id, field: 'outModel' },
  });

  const u = fullUrl(api);
  return `
  <div class="api-card">
    <div class="api-card-head">
      ${methodDD}
      <input class="api-version" data-api="${api.id}" data-field="version" value="${esc(api.version)}" spellcheck="false" placeholder="v1">
      <input class="api-route" data-api="${api.id}" data-field="route" value="${esc(api.route)}" spellcheck="false" placeholder="users/:id">
      <button class="model-del" data-del-api="${api.id}" title="Delete endpoint">&times;</button>
    </div>
    <div class="api-url" data-url="${api.id}">${u ? esc(u) : '<span class="api-url-empty">set base URL &amp; route</span>'}</div>

    <div class="api-sec">
      <div class="api-sec-title">Params</div>
      <div class="api-params">${paramRows}</div>
      <button class="prop-add" data-add-p="${api.id}">+ Add param</button>
    </div>

    <div class="api-sec">
      <div class="api-sec-title">Headers</div>
      <div class="api-headers">${headerRows}</div>
      <button class="prop-add" data-add-h="${api.id}">+ Add header</button>
    </div>

    ${hasBody ? `
    <div class="api-sec">
      <div class="api-sec-title">Body</div>
      <textarea class="api-body" data-api="${api.id}" data-field="body" rows="3" spellcheck="false" placeholder="{ }">${esc(api.body)}</textarea>
    </div>` : ''}

    <div class="api-sec">
      <div class="api-sec-title">Output</div>
      <div class="api-output">
        ${outTypeDD}
        ${outModelDD}
        <span class="api-out-preview">${esc(outputStr(api))}</span>
      </div>
      ${models.length === 0 ? `<div class="api-hint">No error-free models yet — create a valid model to use as output.</div>` : ''}
    </div>
  </div>`;
}

export function renderApi() {
  const board = document.getElementById('api-board');
  if (!board) return;
  board.innerHTML = `
    <div class="api-baseurl">
      <span class="api-baseurl-label">Base URL</span>
      <input class="api-baseurl-input" id="api-baseurl" value="${esc(state.apiBaseUrl)}" spellcheck="false" placeholder="https://api.example.com">
    </div>
    <div class="model-board-head">
      <span class="model-board-title">Endpoints</span>
      <button class="model-add-btn" id="api-new">+ New API</button>
    </div>
    <div class="api-cards">
      ${state.apis.map(renderApiCard).join('')}
      ${state.apis.length === 0 ? `<div class="model-empty">No endpoints yet — click “+ New API” to create one.</div>` : ''}
    </div>`;
}

export function initApi() {
  const board = document.getElementById('api-board');
  if (!board) return;

  board.addEventListener('click', e => {
    const t = e.target;
    if (t.id === 'api-new') return addApi();
    if (t.dataset.addH) return addHeader(getApi(t.dataset.addH));
    if (t.dataset.delH) return delHeader(getApi(t.dataset.api), t.dataset.delH);
    if (t.dataset.addP) return addParam(getApi(t.dataset.addP));
    if (t.dataset.delP) return delParam(getApi(t.dataset.api), t.dataset.delP);
    if (t.dataset.delApi) return delApi(t.dataset.delApi);
  });

  // Text edits: update state in place and refresh the URL preview, no re-render.
  board.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'api-baseurl') { state.apiBaseUrl = t.value; state.apis.forEach(updateUrl); return; }
    const api = getApi(t.dataset.api);
    if (!api) return;
    if (t.dataset.field === 'version') { api.version = t.value; updateUrl(api); }
    else if (t.dataset.field === 'route') { api.route = t.value; updateUrl(api); }
    else if (t.dataset.field === 'body') { api.body = t.value; }
    else if (t.classList.contains('api-h-key')) { const h = getHeader(api, t.dataset.h); if (h) h.key = t.value; }
    else if (t.classList.contains('api-h-val')) { const h = getHeader(api, t.dataset.h); if (h) h.value = t.value; }
    else if (t.classList.contains('api-p-key')) { const p = getParam(api, t.dataset.p); if (p) { p.key = t.value; updateUrl(api); } }
    else if (t.classList.contains('api-p-val')) { const p = getParam(api, t.dataset.p); if (p) { p.value = t.value; updateUrl(api); } }
  });

  // Commit text edits to history on blur/enter (a single entry per field).
  board.addEventListener('change', () => saveHistory());

  // Dropdowns re-render: method toggles the body section, output changes the preview.
  board.addEventListener('dd:change', e => {
    const t = e.target;
    const api = getApi(t.dataset.api);
    if (!api) return;
    const v = e.detail.value;
    if (t.dataset.field === 'method') api.method = v;
    else if (t.dataset.field === 'outType') api.output.type = v;
    else if (t.dataset.field === 'outModel') api.output.model = v;
    else return;
    saveHistory();
    renderApi();
  });
}
