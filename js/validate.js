import { state } from './state.js';
import { modelError, enumError } from './models.js';
import { anyColorError } from './colors.js';
import { anyTypoError } from './typography.js';
import { anyProviderError } from './api.js';

// Aggregate validity across every tab. The export button is gated on this so a
// project with any error can't be exported into broken Dart.
export function anyError() {
  if (state.models.some(m => modelError(m) !== null)) return true;
  if (state.enums.some(e => enumError(e) !== null)) return true;
  if (anyColorError()) return true;
  if (anyTypoError()) return true;
  if (anyProviderError()) return true;
  return false;
}

// Reflect the current validity onto the export button (disabled + label).
export function updateExportButton() {
  const btn = document.getElementById('btn-export-code');
  if (!btn) return;
  const bad = anyError();
  btn.disabled = bad;
  btn.textContent = bad ? '⚠ Fix errors to export' : '⇣ Export code';
}
