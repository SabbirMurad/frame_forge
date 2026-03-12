import { state } from './state.js';
import { canvasWrap } from './utils.js';

export function drawRulers() {
  const wrapRect = canvasWrap.getBoundingClientRect();
  const W = wrapRect.width, H = wrapRect.height;

  // Horizontal ruler
  const rh = document.getElementById('ruler-h-canvas');
  if (!rh) return;
  rh.width = W - 20; rh.height = 20;
  rh.style.position = 'absolute'; rh.style.left = '20px'; rh.style.top = '0';
  const hctx = rh.getContext('2d');
  hctx.clearRect(0, 0, W, 20);
  hctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
  hctx.fillRect(0, 0, W, 20);
  hctx.strokeStyle = '#444'; hctx.fillStyle = '#888';
  hctx.font = '9px IBM Plex Mono, monospace';
  const step = getStep();
  const startX = Math.floor(-state.panX / state.zoom / step) * step;
  for (let x = startX; x < (W - state.panX) / state.zoom; x += step) {
    const px = x * state.zoom + state.panX;
    hctx.beginPath(); hctx.moveTo(px, 14); hctx.lineTo(px, 20); hctx.stroke();
    if (Math.abs(x) % (step * 5) < step * 0.5) {
      hctx.fillText(Math.round(x), px + 2, 12);
    }
  }

  // Vertical ruler
  const rv = document.getElementById('ruler-v-canvas');
  if (!rv) return;
  rv.width = 20; rv.height = H - 20;
  rv.style.position = 'absolute'; rv.style.left = '0'; rv.style.top = '20px';
  const vctx = rv.getContext('2d');
  vctx.clearRect(0, 0, 20, H);
  vctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
  vctx.fillRect(0, 0, 20, H);
  vctx.strokeStyle = '#444'; vctx.fillStyle = '#888';
  vctx.font = '9px IBM Plex Mono, monospace';
  const startY = Math.floor(-state.panY / state.zoom / step) * step;
  for (let y = startY; y < (H - state.panY) / state.zoom; y += step) {
    const py = y * state.zoom + state.panY;
    vctx.beginPath(); vctx.moveTo(14, py); vctx.lineTo(20, py); vctx.stroke();
    if (Math.abs(y) % (step * 5) < step * 0.5) {
      vctx.save(); vctx.translate(12, py + 2); vctx.rotate(-Math.PI / 2);
      vctx.fillText(Math.round(y), 0, 0);
      vctx.restore();
    }
  }
}

function getStep() {
  if (state.zoom > 4) return 10;
  if (state.zoom > 2) return 20;
  if (state.zoom > 0.5) return 50;
  if (state.zoom > 0.2) return 100;
  return 200;
}
