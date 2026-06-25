import { state } from './state.js';
import { render } from './render.js';

export function saveHistory() {
  const snap = JSON.stringify({ nodes: state.nodes, nextId: state.nextId, nextFrameNum: state.nextFrameNum, nextContainerNum: state.nextContainerNum });
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snap);
  state.historyIndex = state.history.length - 1;
}

export function undo() {
  if (state.historyIndex <= 0) return;
  state.historyIndex--;
  loadSnap(state.history[state.historyIndex]);
}

export function redo() {
  if (state.historyIndex >= state.history.length - 1) return;
  state.historyIndex++;
  loadSnap(state.history[state.historyIndex]);
}

function loadSnap(snap) {
  const s = JSON.parse(snap);
  state.nodes = s.nodes;
  state.nextId = s.nextId;
  state.nextFrameNum = s.nextFrameNum ?? state.nextFrameNum;
  state.nextContainerNum = s.nextContainerNum ?? state.nextContainerNum;
  state.selected.clear();
  render();
}
