// Share requests — persisted in localStorage so an invite created in the editor
// shows up in the home page's Requests tab. Demo only: no real collaboration or
// access control happens, this just models the flow across the two pages.

const KEY = 'frameforge_shares';

export function getShares() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}

export function addShare(email, project) {
  const list = getShares();
  list.unshift({
    id: 's' + Date.now() + Math.floor(Math.random() * 1000),
    email,
    project: project || 'Untitled',
    status: 'pending', // pending | accepted | declined
    date: Date.now(),
  });
  save(list);
}

export function setShareStatus(id, status) {
  const list = getShares();
  const r = list.find(x => x.id === id);
  if (r) { r.status = status; save(list); }
  return list;
}

export function pendingCount() {
  return getShares().filter(r => r.status === 'pending').length;
}
