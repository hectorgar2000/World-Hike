import { loadGoogleMaps } from './maps-loader.js';
import { RouteService } from './route-service.js';
import { TerrainRenderer } from './terrain-renderer.js';
import { StepsTracker } from './steps-tracker.js';
import { getTheme } from './biome.js';
import { saveState, loadState } from './storage.js';

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const screenSetup  = $('screen-setup');
const screenHike   = $('screen-hike');
const inputApiKey  = $('input-apikey');
const inputStart   = $('input-start');
const inputEnd     = $('input-end');
const btnCalc      = $('btn-calculate');
const setupStatus  = $('setup-status');
const btnBack      = $('btn-back');
const labelStart   = $('label-start');
const labelEnd     = $('label-end');
const statProgKm   = $('stat-progress-km');
const statTotalKm  = $('stat-total-km');
const statSteps    = $('stat-steps');
const statKmDone   = $('stat-km-done');
const statKmLeft   = $('stat-km-left');
const statElevGain = $('stat-elev-gain');
const progressFill = $('progress-fill');
const badgeElev    = $('badge-elevation');
const badgeBiome   = $('badge-biome');
const inputStepsAdd= $('input-steps-add');
const btnAddSteps  = $('btn-add-steps');
const inputHealth  = $('input-health-file');
const importStatus = $('import-status');
const scrollHint   = $('scroll-hint');

// ── State ─────────────────────────────────────────────────────────────────────
const router   = new RouteService();
const tracker  = new StepsTracker();
let terrain    = null;
let routeData  = null;

// ── Boot ──────────────────────────────────────────────────────────────────────
function init() {
  const saved = loadState();
  if (saved?.apiKey)   inputApiKey.value = saved.apiKey;
  if (saved?.start)    inputStart.value  = saved.start;
  if (saved?.end)      inputEnd.value    = saved.end;
  if (saved?.steps)    tracker.load(saved.steps);

  btnCalc.addEventListener('click', onCalculate);
  btnBack.addEventListener('click', () => show(screenSetup));
  btnAddSteps.addEventListener('click', onAddSteps);
  inputStepsAdd.addEventListener('keydown', e => e.key === 'Enter' && onAddSteps());
  inputHealth.addEventListener('change', onHealthImport);
  tracker.onChange = onStepsChanged;

  // Restore route without re-fetching if all data is saved
  if (saved?.routeData) restoreRoute(saved);

  setTimeout(() => scrollHint.classList.add('hidden'), 3500);
}

function show(screen) {
  screenSetup.classList.remove('active');
  screenHike.classList.remove('active');
  screen.classList.add('active');
  if (screen === screenHike && terrain) terrain._resize();
}

function setStatus(msg, isError = false) {
  setupStatus.textContent = msg;
  setupStatus.classList.remove('hidden', 'error');
  if (isError) setupStatus.classList.add('error');
}

// ── Route calculation ─────────────────────────────────────────────────────────
async function onCalculate() {
  const apiKey = inputApiKey.value.trim();
  const start  = inputStart.value.trim();
  const end    = inputEnd.value.trim();
  if (!apiKey || !start || !end) { setStatus('Rellena todos los campos.', true); return; }

  btnCalc.disabled = true;
  try {
    setStatus('Cargando Google Maps...');
    await loadGoogleMaps(apiKey);
    router.init();

    routeData = await router.buildRoute(start, end, setStatus);

    saveState({ apiKey, start, end, routeData, steps: tracker.serialize() });
    beginHike();
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    btnCalc.disabled = false;
  }
}

async function restoreRoute(saved) {
  try {
    await loadGoogleMaps(saved.apiKey);
    router.init();
    routeData = saved.routeData;
    beginHike();
  } catch (_) {}
}

// ── Hike screen ───────────────────────────────────────────────────────────────
function beginHike() {
  labelStart.textContent = shortAddr(routeData.startName);
  labelEnd.textContent   = shortAddr(routeData.endName);
  statTotalKm.textContent = (routeData.totalDistanceM / 1000).toFixed(1);

  show(screenHike);
  setupStatus.classList.add('hidden');

  if (!terrain) terrain = new TerrainRenderer($('canvas-terrain'));
  terrain.loadRoute(routeData.points);
  terrain.setWalked(tracker.distanceM);

  updateStats();
  updateBadges();
  startAutoSave();
}

function shortAddr(addr) {
  return addr.split(',').slice(0, 2).join(',').trim();
}

// ── Steps ─────────────────────────────────────────────────────────────────────
function onAddSteps() {
  if (tracker.add(inputStepsAdd.value)) inputStepsAdd.value = '';
}

async function onHealthImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  importStatus.textContent = 'Importando...';
  try {
    const r = await tracker.importAppleHealthXML(file);
    importStatus.textContent = `✓ ${r.imported.toLocaleString()} pasos (${r.days} días)`;
  } catch (err) {
    importStatus.textContent = `✗ ${err.message}`;
  }
  e.target.value = '';
}

function onStepsChanged() {
  if (!terrain || !routeData) return;
  terrain.setWalked(tracker.distanceM);
  updateStats();
  updateBadges();
  persistSteps();
}

// ── Stats & badges ────────────────────────────────────────────────────────────
function updateStats() {
  if (!routeData) return;
  const walkedKm  = tracker.distanceKm;
  const totalKm   = routeData.totalDistanceM / 1000;
  const leftKm    = Math.max(0, totalKm - walkedKm);
  const pct       = Math.min(100, (walkedKm / totalKm) * 100);

  statProgKm.textContent  = walkedKm.toFixed(1);
  statTotalKm.textContent = totalKm.toFixed(1);
  statSteps.textContent   = tracker.totalSteps.toLocaleString();
  statKmDone.textContent  = walkedKm.toFixed(1);
  statKmLeft.textContent  = leftKm.toFixed(1);
  progressFill.style.width = pct + '%';

  statElevGain.textContent = elevGainUpTo(routeData.points, tracker.distanceM).toFixed(0);
}

function updateBadges() {
  if (!terrain || !routeData) return;
  const m     = tracker.distanceM;
  const elev  = terrain.getElevationAt(m);
  const biome = terrain.getBiomeAt(m);
  const theme = getTheme(biome);

  badgeElev.textContent  = `${elev.toFixed(0)} m`;
  badgeBiome.textContent = theme.name;
}

function elevGainUpTo(points, upToM) {
  let gain = 0, prev = points[0]?.elevation ?? 0;
  for (const p of points) {
    if (p.distanceM > upToM) break;
    if (p.elevation > prev) gain += p.elevation - prev;
    prev = p.elevation;
  }
  return gain;
}

// ── Persistence ───────────────────────────────────────────────────────────────
let _saveTimer = null;
function startAutoSave() {
  clearInterval(_saveTimer);
  _saveTimer = setInterval(persistSteps, 30_000);
}

function persistSteps() {
  const saved = loadState();
  if (saved) saveState({ ...saved, steps: tracker.serialize() });
}

init();
