// Biome detection from geographic coordinates + elevation,
// and visual themes for the terrain renderer.

export const THEMES = {
  galicia: {
    name: 'Galicia · Verde y brumoso',
    skyTop: '#2e4a2e',
    skyBottom: '#6aac6a',
    bgColor: 'rgba(50,100,50,0.45)',
    groundTop: '#3a7a2a',
    groundBase: '#1e4a12',
    groundLine: '#2e6a1e',
    fog: 'rgba(120,190,120,0.32)',
  },
  meseta: {
    name: 'Meseta · Dorada y árida',
    skyTop: '#b07818',
    skyBottom: '#e8c050',
    bgColor: 'rgba(180,140,60,0.45)',
    groundTop: '#c89030',
    groundBase: '#8a6018',
    groundLine: '#b07828',
    fog: 'rgba(240,210,130,0.28)',
  },
  mediterranean: {
    name: 'Mediterráneo · Cálido',
    skyTop: '#1050a0',
    skyBottom: '#58b0e8',
    bgColor: 'rgba(100,140,80,0.4)',
    groundTop: '#907050',
    groundBase: '#604830',
    groundLine: '#806040',
    fog: 'rgba(160,210,255,0.2)',
  },
  alpine: {
    name: 'Zona alpina · Nieve y roca',
    skyTop: '#142050',
    skyBottom: '#7aaad8',
    bgColor: 'rgba(80,90,120,0.5)',
    groundTop: '#c8c8d0',
    groundBase: '#808090',
    groundLine: '#a0a0b0',
    fog: 'rgba(200,220,250,0.38)',
  },
  highland: {
    name: 'Tierras altas',
    skyTop: '#203858',
    skyBottom: '#7898c0',
    bgColor: 'rgba(60,90,80,0.45)',
    groundTop: '#587848',
    groundBase: '#385028',
    groundLine: '#487038',
    fog: 'rgba(150,190,210,0.3)',
  },
  temperate: {
    name: 'Zona templada',
    skyTop: '#1858b0',
    skyBottom: '#70c0ee',
    bgColor: 'rgba(60,110,60,0.4)',
    groundTop: '#3a8a3a',
    groundBase: '#205820',
    groundLine: '#2a7a2a',
    fog: 'rgba(170,220,170,0.22)',
  },
};

export function getTheme(biome) {
  return THEMES[biome] || THEMES.temperate;
}

export function detectBiome(lat, lng, elevation) {
  if (elevation > 2200) return 'alpine';
  if (elevation > 1500) return 'highland';

  // Iberian Peninsula
  if (lat >= 35.5 && lat <= 44.5 && lng >= -9.5 && lng <= 4.5) {
    // Northwest corner: Galicia, Asturias, Cantabria, Basque highlands
    if (lat >= 42.5 && lng <= -5.5) return 'galicia';
    if (lat >= 43.0 && lng <= -1.5) return 'galicia';
    // North Portugal
    if (lat >= 41.0 && lng < -6.5) return 'galicia';
    // Andalusia & SE coast
    if (lat < 38.5) return 'mediterranean';
    // Levante / Catalonia coast
    if (lng >= 0.0 && lat < 43.0) return 'mediterranean';
    // Meseta (central plateau)
    if (lat >= 38.5 && lat <= 43.0 && lng >= -7.0 && lng <= 1.5 && elevation < 1100) return 'meseta';
    return 'highland';
  }

  // Portugal south
  if (lat >= 36.5 && lat <= 41.0 && lng >= -9.5 && lng <= -6.0) {
    return lat < 38.5 ? 'mediterranean' : 'meseta';
  }

  // France
  if (lat >= 42.0 && lat <= 51.5 && lng >= -5.0 && lng <= 9.5) {
    if (lat < 44.5 && lng > 2.0) return 'mediterranean';
    if (elevation > 700) return 'highland';
    return 'temperate';
  }

  // Italy
  if (lat >= 36.0 && lat <= 47.5 && lng >= 6.5 && lng <= 18.5) {
    if (lat > 44.5 && elevation > 500) return 'alpine';
    return 'mediterranean';
  }

  // Central Europe, UK, Scandinavia
  if (lat >= 46.0 && lat <= 72.0) {
    if (elevation > 900) return 'highland';
    return 'temperate';
  }

  return 'temperate';
}
