// 2D side-scrolling terrain renderer.
// Draws a scrollable canvas with real elevation data, biome visuals, parallax
// background, decorations, and an animated hiking character.

import { getTheme } from './biome.js';

const CHAR_X_RATIO = 0.30; // character fixed at 30% from left
const DEFAULT_VIEW_KM = 5;  // km visible at start

export class TerrainRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.points = [];       // {distanceM, elevation, lat, lng, biome}
    this.totalM = 0;
    this.minElev = 0;
    this.maxElev = 100;
    this.walkedM = 0;
    this.cameraM = 0;       // world meters at left edge of canvas
    this.viewM = DEFAULT_VIEW_KM * 1000;
    this.W = 1;
    this.H = 1;
    this._raf = null;
    this._dragActive = false;
    this._dragStartX = 0;
    this._dragStartCam = 0;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._bindInteraction();
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const wrap = this.canvas.parentElement;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    this.W = r.width;
    this.H = r.height;
    this.canvas.width = r.width * dpr;
    this.canvas.height = r.height * dpr;
    this.canvas.style.width = r.width + 'px';
    this.canvas.style.height = r.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  loadRoute(points) {
    this.points = points;
    this.totalM = points.at(-1).distanceM;
    this.minElev = Math.min(...points.map(p => p.elevation));
    this.maxElev = Math.max(...points.map(p => p.elevation));
    if (this.maxElev - this.minElev < 150) this.maxElev = this.minElev + 150;
    this.walkedM = 0;
    this.cameraM = 0;
    this._startLoop();
  }

  setWalked(meters) {
    this.walkedM = Math.min(meters, this.totalM);
    if (!this._dragActive) this._snapCamera();
  }

  // ── Coordinate helpers ─────────────────────────────────────────────────────

  get _ppm() { return this.W / this.viewM; } // pixels per meter

  _worldToX(m) { return (m - this.cameraM) * this._ppm; }
  _xToWorld(px) { return px / this._ppm + this.cameraM; }

  _elevToY(elev) {
    const terrainH = this.H * 0.58;
    const skyH = this.H - terrainH;
    const t = (elev - this.minElev) / (this.maxElev - this.minElev);
    return this.H - (t * terrainH * 0.82 + terrainH * 0.12);
  }

  _elevAt(m) {
    if (!this.points.length) return 0;
    if (m <= 0) return this.points[0].elevation;
    if (m >= this.totalM) return this.points.at(-1).elevation;
    let lo = 0, hi = this.points.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.points[mid].distanceM <= m) lo = mid; else hi = mid;
    }
    const a = this.points[lo], b = this.points[hi];
    const t = (m - a.distanceM) / (b.distanceM - a.distanceM);
    return a.elevation + (b.elevation - a.elevation) * t;
  }

  _biomeAt(m) {
    if (!this.points.length) return 'temperate';
    const idx = Math.round((m / this.totalM) * (this.points.length - 1));
    return this.points[Math.max(0, Math.min(this.points.length - 1, idx))].biome || 'temperate';
  }

  getElevationAt(m) { return this._elevAt(m); }
  getBiomeAt(m) { return this._biomeAt(m); }

  _snapCamera() {
    const target = this.walkedM - this.W * CHAR_X_RATIO / this._ppm;
    this.cameraM = Math.max(0, Math.min(target, this.totalM - this.viewM));
  }

  // ── Camera drag / scroll ───────────────────────────────────────────────────

  _bindInteraction() {
    const c = this.canvas;
    const px = e => e.touches ? e.touches[0].clientX : e.clientX;

    c.addEventListener('mousedown', e => { this._dragActive = true; this._dragStartX = px(e); this._dragStartCam = this.cameraM; });
    c.addEventListener('touchstart', e => { this._dragActive = true; this._dragStartX = px(e); this._dragStartCam = this.cameraM; }, { passive: true });

    const move = e => {
      if (!this._dragActive) return;
      e.preventDefault?.();
      const dx = (px(e) - this._dragStartX) / this._ppm;
      const maxCam = Math.max(0, this.walkedM - this.W * CHAR_X_RATIO / this._ppm);
      this.cameraM = Math.max(0, Math.min(this._dragStartCam - dx, maxCam));
    };
    c.addEventListener('mousemove', move);
    c.addEventListener('touchmove', move, { passive: false });

    const end = () => { this._dragActive = false; };
    c.addEventListener('mouseup', end);
    c.addEventListener('mouseleave', end);
    c.addEventListener('touchend', end);

    // Wheel zooms view width
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.viewM = Math.max(1000, Math.min(25000, this.viewM + e.deltaY * 8));
      this._snapCamera();
    }, { passive: false });
  }

  // ── Animation loop ─────────────────────────────────────────────────────────

  _startLoop() {
    if (this._raf) return;
    const tick = t => { this._render(t); this._raf = requestAnimationFrame(tick); };
    this._raf = requestAnimationFrame(tick);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  _render(t = 0) {
    const { ctx, W, H } = this;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);

    const charBiome = this._biomeAt(this.walkedM);
    const theme = getTheme(charBiome);

    this._drawSky(theme);
    this._drawBgHills(theme, t);
    this._drawTerrain(theme);
    this._drawDecorations(t);
    this._drawCharacter(t);
    this._drawFog(theme);
  }

  _drawSky(theme) {
    const { ctx, W, H } = this;
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
    g.addColorStop(0, theme.skyTop);
    g.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.62);
  }

  _drawBgHills(theme, t) {
    const { ctx, W, H } = this;
    const off = this.cameraM * 0.00025; // parallax

    ctx.fillStyle = theme.bgColor;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.56);
    const segs = 10;
    for (let i = 0; i <= segs; i++) {
      const x = (i / segs) * W;
      const wx = x + off * W;
      const y = H * 0.38
        - Math.sin(wx * 0.004) * H * 0.10
        - Math.sin(wx * 0.009 + 1.2) * H * 0.06;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
  }

  _terrainSamples(step = 4) {
    const samples = [];
    for (let sx = -step; sx <= this.W + step; sx += step) {
      const m = this._xToWorld(sx);
      samples.push({ sx, y: this._elevToY(this._elevAt(m)), m });
    }
    return samples;
  }

  _drawTerrain(theme) {
    const { ctx, H } = this;
    const pts = this._terrainSamples(4);
    if (pts.length < 2) return;

    const gnd = ctx.createLinearGradient(0, H * 0.35, 0, H);
    gnd.addColorStop(0, theme.groundTop);
    gnd.addColorStop(1, theme.groundBase);
    ctx.fillStyle = gnd;

    ctx.beginPath();
    ctx.moveTo(pts[0].sx, H);
    ctx.lineTo(pts[0].sx, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], c = pts[i];
      const cx = (p.sx + c.sx) / 2;
      ctx.bezierCurveTo(cx, p.y, cx, c.y, c.sx, c.y);
    }
    ctx.lineTo(pts.at(-1).sx, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = theme.groundLine;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pts[0].sx, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], c = pts[i];
      const cx = (p.sx + c.sx) / 2;
      ctx.bezierCurveTo(cx, p.y, cx, c.y, c.sx, c.y);
    }
    ctx.stroke();
  }

  _drawDecorations(t) {
    const spacing = 90; // world meters between decoration slots
    const startM = Math.floor(this._xToWorld(-spacing) / spacing) * spacing;
    const endM = this._xToWorld(this.W + spacing);

    for (let m = startM; m < endM; m += spacing) {
      const biome = this._biomeAt(m);
      const sx = this._worldToX(m);
      const sy = this._elevToY(this._elevAt(m));
      const rng = Math.abs(Math.sin(m * 0.071 + 3.14));
      const scale = 0.65 + rng * 0.7;
      const offX = (Math.sin(m * 0.031) * 0.5) * spacing * this._ppm * 0.6;
      this._drawDecor(sx + offX, sy, biome, scale, m, rng);
    }
  }

  _drawDecor(x, y, biome, sc, seed, rng) {
    const { ctx } = this;
    if (biome === 'galicia' || biome === 'temperate') {
      rng > 0.4 ? this._tree(x, y, sc, '#1e4a14', '#3a7a24') : this._bushGreen(x, y, sc);
    } else if (biome === 'meseta') {
      rng > 0.55 ? this._dryGrass(x, y, sc) : this._rock(x, y, sc, '#9a8040', '#c0a850');
    } else if (biome === 'alpine') {
      rng > 0.5 ? this._rock(x, y, sc, '#707080', '#909098') : this._snowPatch(x, y, sc);
    } else if (biome === 'highland') {
      rng > 0.5 ? this._tree(x, y, sc * 0.75, '#2a5a1a', '#4a7a2a') : this._rock(x, y, sc * 0.8, '#5a6858', '#7a8870');
    } else if (biome === 'mediterranean') {
      rng > 0.55 ? this._cypress(x, y, sc) : this._rock(x, y, sc * 0.7, '#806840', '#a08850');
    }
  }

  _tree(x, y, sc, darkCol, lightCol) {
    const { ctx } = this;
    const h = 32 * sc, w = 13 * sc;
    ctx.fillStyle = '#4a2a10';
    ctx.fillRect(x - 2 * sc, y - h * 0.18, 4 * sc, h * 0.18);
    ctx.fillStyle = darkCol;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x - w, y - h * 0.38);
    ctx.lineTo(x - w * 0.55, y - h * 0.38);
    ctx.lineTo(x - w * 0.78, y);
    ctx.lineTo(x + w * 0.78, y);
    ctx.lineTo(x + w * 0.55, y - h * 0.38);
    ctx.lineTo(x + w, y - h * 0.38);
    ctx.closePath();
    ctx.fill();
    // highlight
    ctx.fillStyle = lightCol;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x - w * 0.3, y - h * 0.55);
    ctx.lineTo(x, y - h * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  _cypress(x, y, sc) {
    const { ctx } = this;
    const h = 44 * sc, w = 7 * sc;
    ctx.fillStyle = '#184018';
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.5, w, h * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _bushGreen(x, y, sc) {
    const { ctx } = this;
    ctx.fillStyle = '#285820';
    ctx.beginPath();
    ctx.ellipse(x, y - 7 * sc, 11 * sc, 7 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _dryGrass(x, y, sc) {
    const { ctx } = this;
    ctx.strokeStyle = '#906820';
    ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) {
      const lean = i % 2 === 0 ? 2 : -3;
      ctx.beginPath();
      ctx.moveTo(x + i * 3 * sc, y);
      ctx.lineTo(x + i * 3 * sc + lean * sc, y - 9 * sc);
      ctx.stroke();
    }
  }

  _rock(x, y, sc, dark, light) {
    const { ctx } = this;
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x - 9 * sc, y);
    ctx.lineTo(x - 11 * sc, y - 8 * sc);
    ctx.lineTo(x - 3 * sc, y - 13 * sc);
    ctx.lineTo(x + 6 * sc, y - 11 * sc);
    ctx.lineTo(x + 10 * sc, y - 4 * sc);
    ctx.lineTo(x + 9 * sc, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(x - 3 * sc, y - 13 * sc);
    ctx.lineTo(x + 6 * sc, y - 11 * sc);
    ctx.lineTo(x + 2 * sc, y - 7 * sc);
    ctx.closePath();
    ctx.fill();
  }

  _snowPatch(x, y, sc) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(245,248,255,0.82)';
    ctx.beginPath();
    ctx.ellipse(x, y - 3, 13 * sc, 4 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawCharacter(t) {
    if (!this.totalM) return;
    const { ctx } = this;
    const charWorldX = this.walkedM;
    const sx = this._worldToX(charWorldX);
    const sy = this._elevToY(this._elevAt(charWorldX));

    const walk = (t / 380) % (Math.PI * 2);
    const bob = Math.sin(walk * 2) * 1.8;
    const cy = sy + bob;
    const sc = 1.15;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 2, 10 * sc, 3 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    // Backpack
    ctx.fillStyle = '#5a3a18';
    ctx.fillRect(sx + 4 * sc, cy - 20 * sc, 5 * sc, 9 * sc);
    ctx.fillStyle = '#7a5a28';
    ctx.fillRect(sx + 4 * sc, cy - 20 * sc, 5 * sc, 2 * sc);

    // Body
    ctx.fillStyle = '#2a4a8a';
    ctx.beginPath();
    this._rrect(ctx, sx - 5 * sc, cy - 21 * sc, 10 * sc, 13 * sc, 2 * sc);
    ctx.fill();

    // Head
    ctx.fillStyle = '#f0c090';
    ctx.beginPath();
    ctx.arc(sx, cy - 26 * sc, 5.5 * sc, 0, Math.PI * 2);
    ctx.fill();

    // Hat brim + top
    ctx.fillStyle = '#6a3810';
    ctx.beginPath();
    ctx.ellipse(sx, cy - 30 * sc, 7.5 * sc, 2.5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(sx - 3.5 * sc, cy - 37 * sc, 7 * sc, 7 * sc);

    // Legs walking
    const swing = Math.sin(walk) * 6;
    ctx.lineCap = 'round';
    ctx.lineWidth = 3.5 * sc;
    ctx.strokeStyle = '#1a3070';
    ctx.beginPath();
    ctx.moveTo(sx - 1 * sc, cy - 8 * sc);
    ctx.lineTo(sx - 3 * sc + swing, cy + 2 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 1 * sc, cy - 8 * sc);
    ctx.lineTo(sx + 3 * sc - swing, cy + 2 * sc);
    ctx.stroke();

    // Boots
    ctx.fillStyle = '#3a2808';
    ctx.beginPath();
    ctx.ellipse(sx - 3 * sc + swing, cy + 3 * sc, 4 * sc, 2 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 3 * sc - swing, cy + 3 * sc, 4 * sc, 2 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hiking pole
    ctx.strokeStyle = '#b0b0b0';
    ctx.lineWidth = 1.8;
    const poleSwing = Math.sin(walk + Math.PI) * 7;
    ctx.beginPath();
    ctx.moveTo(sx + 5 * sc, cy - 18 * sc);
    ctx.lineTo(sx + 12 * sc + poleSwing, cy + 4 * sc);
    ctx.stroke();
  }

  _rrect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  _drawFog(theme) {
    if (!theme.fog) return;
    const { ctx, W, H } = this;
    const fw = W * 0.14;
    const gL = ctx.createLinearGradient(0, 0, fw, 0);
    gL.addColorStop(0, theme.fog);
    gL.addColorStop(1, 'transparent');
    ctx.fillStyle = gL;
    ctx.fillRect(0, 0, fw, H);
    const gR = ctx.createLinearGradient(W - fw, 0, W, 0);
    gR.addColorStop(0, 'transparent');
    gR.addColorStop(1, theme.fog);
    ctx.fillStyle = gR;
    ctx.fillRect(W - fw, 0, fw, H);
  }
}
