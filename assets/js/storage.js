const KEY = 'world-hike-v1';

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export function clearState() {
  localStorage.removeItem(KEY);
}
