// Home / dashboard page. Switches between the sidebar sections (Projects,
// Settings, Account, Billing) by toggling the matching <section>.

import { ddTrigger, initDropdowns } from './dropdown.js';
import { getShares, setShareStatus, pendingCount } from './shares.js';

const navItems = document.querySelectorAll('.home-nav-item');
const pages = document.querySelectorAll('.home-page');

function showPage(name) {
  navItems.forEach(b => b.classList.toggle('active', b.dataset.page === name));
  pages.forEach(p => p.classList.toggle('active', p.dataset.page === name));
  if (name === 'requests') renderRequests(); // refresh in case an invite just arrived
}

navItems.forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));

// ───────── Demo projects ─────────
// Placeholder list until real projects are persisted. Each card opens the editor.
const demoProjects = [
  { name: 'Mobile Banking App', edited: 'Edited 2 hours ago',  c1: '#5b8af5', c2: '#3d6de0', pinned: true },
  { name: 'E-commerce Store',   edited: 'Edited yesterday',    c1: '#f5576c', c2: '#f093fb', pinned: false },
  { name: 'Fitness Tracker',    edited: 'Edited 3 days ago',   c1: '#11998e', c2: '#38ef7d', pinned: false },
  { name: 'Travel Booking',     edited: 'Edited last week',    c1: '#f7971e', c2: '#ffd200', pinned: false },
  { name: 'Recipe Manager',     edited: 'Edited 2 weeks ago',  c1: '#7b4397', c2: '#dc2430', pinned: false },
  { name: 'Podcast Player',     edited: 'Edited last month',   c1: '#2193b0', c2: '#6dd5ed', pinned: false },
];

const projectSearch = document.getElementById('project-search');

function makeCard(p) {
  const card = document.createElement('div');
  card.className = 'project-card' + (p.pinned ? ' pinned' : '');
  card.setAttribute('role', 'button');
  card.tabIndex = 0;
  card.innerHTML = `
    <button type="button" class="project-pin" title="${p.pinned ? 'Unpin' : 'Pin'}" aria-label="${p.pinned ? 'Unpin project' : 'Pin project'}"></button>
    <div class="project-preview" style="background:linear-gradient(135deg, ${p.c1}, ${p.c2})">${p.name.charAt(0)}</div>
    <div class="project-meta">
      <div class="project-name">${p.name}</div>
      <div class="project-edited">${p.edited}</div>
    </div>`;
  const open = () => { window.location.href = 'index.html'; };
  card.addEventListener('click', e => { if (!e.target.closest('.project-pin')) open(); });
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  card.querySelector('.project-pin').addEventListener('click', e => {
    e.stopPropagation();
    p.pinned = !p.pinned;
    renderProjects();
  });
  return card;
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  const q = (projectSearch?.value || '').trim().toLowerCase();
  const matches = demoProjects.filter(p => p.name.toLowerCase().includes(q));
  // Pinned first, otherwise keep the original order (stable).
  const sorted = matches.map((p, i) => ({ p, i }))
    .sort((a, b) => (b.p.pinned - a.p.pinned) || (a.i - b.i))
    .map(x => x.p);

  grid.innerHTML = '';
  if (!sorted.length) {
    grid.innerHTML = `<div class="home-placeholder">No projects match “${q}”.</div>`;
    return;
  }
  sorted.forEach(p => grid.appendChild(makeCard(p)));
}

projectSearch?.addEventListener('input', renderProjects);
renderProjects();

// ───────── Toast ─────────
let toastEl = null, toastTimer = null;
function toast(msg) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'home-toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

// ───────── Account page (UI scaffold) ─────────
// None of these perform real account changes — they only update the UI / preview.

// Avatar: preview a locally-chosen image (no upload).
const avatarInput = document.getElementById('avatar-input');
document.getElementById('avatar-change')?.addEventListener('click', () => avatarInput?.click());
avatarInput?.addEventListener('change', () => {
  const file = avatarInput.files[0];
  avatarInput.value = '';
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('Image must be under 2MB'); return; }
  const reader = new FileReader();
  reader.onload = () => { document.getElementById('acct-avatar').src = reader.result; toast('Photo updated'); };
  reader.readAsDataURL(file);
});

document.getElementById('profile-form')?.addEventListener('submit', (e) => { e.preventDefault(); toast('Profile saved'); });

// Change password: only checks the two new entries match (demo, nothing stored).
document.getElementById('password-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const [cur, next, confirm] = [...e.target.querySelectorAll('input')].map(i => i.value);
  if (!cur || !next) { toast('Fill in your current and new password'); return; }
  if (next.length < 8) { toast('New password must be at least 8 characters'); return; }
  if (next !== confirm) { toast('New passwords don’t match'); return; }
  e.target.reset();
  toast('Password updated');
});

document.getElementById('twofa-toggle')?.addEventListener('change', (e) => {
  toast(e.target.checked ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
});

document.querySelectorAll('[data-connect]').forEach(btn => btn.addEventListener('click', () => toast(`Connect ${btn.dataset.connect} — coming soon`)));

document.getElementById('signout-all')?.addEventListener('click', () => toast('Signed out of all other sessions'));
document.querySelectorAll('.session-out').forEach(btn => btn.addEventListener('click', () => {
  const row = btn.closest('.acct-row');
  if (row) row.remove();
  toast('Session signed out');
}));

document.getElementById('export-data')?.addEventListener('click', () => toast('Preparing your data export…'));

// Timezone — uses the same custom dropdown component as the editor.
const TIMEZONES = [
  '(GMT+06:00) Dhaka',
  '(GMT+00:00) London',
  '(GMT-05:00) New York',
  '(GMT-08:00) Los Angeles',
  '(GMT+09:00) Tokyo',
].map(t => ({ value: t, label: t }));

const tzField = document.getElementById('tz-field');
if (tzField) {
  tzField.innerHTML = ddTrigger({ value: TIMEZONES[0].value, options: TIMEZONES, data: { tz: '1' } });
  // The dropdown only updates its stored value on change; refresh the visible label too.
  tzField.addEventListener('dd:change', (e) => {
    const opt = TIMEZONES.find(o => o.value === e.detail.value);
    const label = tzField.querySelector('.dd-label');
    if (label && opt) label.textContent = opt.label;
  });
}
initDropdowns();

// ───────── Requests (collaboration invites from the editor) ─────────
const escHtml = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function updateRequestsBadge() {
  const badge = document.getElementById('requests-badge');
  if (badge) badge.textContent = pendingCount() ? String(pendingCount()) : '';
}

function renderRequests() {
  const list = document.getElementById('requests-list');
  if (!list) return;
  const reqs = getShares();
  if (!reqs.length) {
    list.innerHTML = '<div class="home-placeholder">No collaboration requests yet. Share a project from the editor to send one.</div>';
    updateRequestsBadge();
    return;
  }
  list.innerHTML = '';
  reqs.forEach(r => {
    const item = document.createElement('div');
    item.className = 'req-item' + (r.status !== 'pending' ? ' done' : '');
    let actions;
    if (r.status === 'accepted') actions = '<span class="req-status accepted">Accepted &middot; can edit</span>';
    else if (r.status === 'declined') actions = '<span class="req-status declined">Declined</span>';
    else actions = `<button type="button" class="acct-btn-ghost" data-decline="${r.id}">Decline</button>`
                 + `<button type="button" class="acct-btn" data-accept="${r.id}">Accept</button>`;
    item.innerHTML = `
      <div class="req-ava">${escHtml(r.email[0] || '?')}</div>
      <div class="req-info">
        <div class="req-email">${escHtml(r.email)}</div>
        <div class="req-sub">Wants access to <strong>${escHtml(r.project)}</strong></div>
      </div>
      <div class="req-actions">${actions}</div>`;
    list.appendChild(item);
  });
  list.querySelectorAll('[data-accept]').forEach(b => b.addEventListener('click', () => {
    setShareStatus(b.dataset.accept, 'accepted'); renderRequests(); toast('Request accepted — they can now edit this project');
  }));
  list.querySelectorAll('[data-decline]').forEach(b => b.addEventListener('click', () => {
    setShareStatus(b.dataset.decline, 'declined'); renderRequests(); toast('Request declined');
  }));
  updateRequestsBadge();
}

renderRequests();

// Delete account: two-step confirm. Deletion is intentionally a no-op (demo).
const delBtn = document.getElementById('delete-account');
let delConfirm = null;
delBtn?.addEventListener('click', () => {
  if (delBtn.classList.contains('confirming')) {
    clearTimeout(delConfirm);
    delBtn.classList.remove('confirming');
    delBtn.textContent = 'Delete';
    toast('Account deletion is disabled in this demo');
    return;
  }
  delBtn.classList.add('confirming');
  delBtn.textContent = 'Click again to confirm';
  delConfirm = setTimeout(() => { delBtn.classList.remove('confirming'); delBtn.textContent = 'Delete'; }, 4000);
});

// New project → straight into the editor (the demo project list is added later).
document.getElementById('new-project-btn')?.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Logout → authentication page (built in a later task).
document.getElementById('home-logout')?.addEventListener('click', () => {
  window.location.href = 'auth.html';
});
