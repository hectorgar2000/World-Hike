// Wraps Google Maps JS API: routing + elevation + biome annotation.
// Must be called after loadGoogleMaps() resolves.

import { detectBiome } from './biome.js';

export class RouteService {
  init() {
    this.directions = new google.maps.DirectionsService();
    this.elevation = new google.maps.ElevationService();
  }

  _calcRoute(origin, destination, mode) {
    return new Promise((resolve, reject) => {
      this.directions.route(
        { origin, destination, travelMode: mode },
        (res, status) => status === 'OK' ? resolve(res) : reject(new Error(`Ruta no encontrada (${status}). Prueba con ciudades más conocidas.`))
      );
    });
  }

  _getElevation(path, samples) {
    return new Promise((resolve, reject) => {
      this.elevation.getElevationAlongPath(
        { path, samples },
        (res, status) => status === 'OK' ? resolve(res) : reject(new Error(`Error al obtener altitudes (${status}).`))
      );
    });
  }

  _extractPath(directionsResult) {
    const path = [];
    directionsResult.routes[0].legs.forEach(leg =>
      leg.steps.forEach(step =>
        step.path.forEach(pt => path.push(pt))
      )
    );
    return path;
  }

  _totalDistanceM(directionsResult) {
    return directionsResult.routes[0].legs.reduce((s, l) => s + l.distance.value, 0);
  }

  async buildRoute(origin, destination, onStatus) {
    onStatus('Calculando ruta...');

    // Try walking first, fall back to driving for long routes
    let dir;
    try {
      dir = await this._calcRoute(origin, destination, google.maps.TravelMode.WALKING);
    } catch (_) {
      onStatus('Ruta a pie no disponible, usando modo conducción...');
      dir = await this._calcRoute(origin, destination, google.maps.TravelMode.DRIVING);
    }

    const path = this._extractPath(dir);
    const totalDistanceM = this._totalDistanceM(dir);
    const leg0 = dir.routes[0].legs[0];
    const legN = dir.routes[0].legs[dir.routes[0].legs.length - 1];

    onStatus('Obteniendo perfil de altitud...');
    const samples = Math.min(512, Math.max(80, Math.floor(totalDistanceM / 150)));
    const elevResults = await this._getElevation(path, samples);

    onStatus('Detectando biomas y terreno...');

    // Build elevation profile with cumulative distance
    const n = elevResults.length;
    const points = elevResults.map((r, i) => ({
      distanceM: (i / (n - 1)) * totalDistanceM,
      elevation: r.elevation,
      lat: r.location.lat(),
      lng: r.location.lng(),
      biome: null,
    }));

    // Detect biome every ~10 points, then fill gaps
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 50))) {
      const p = points[i];
      p.biome = detectBiome(p.lat, p.lng, p.elevation);
    }
    let last = 'temperate';
    for (const p of points) {
      if (p.biome) last = p.biome;
      else p.biome = last;
    }

    return {
      points,
      totalDistanceM,
      startName: leg0.start_address,
      endName: legN.end_address,
    };
  }
}
