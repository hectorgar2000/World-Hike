// Wraps Google Maps JS API: routing + elevation + biome annotation.
// Must be called after loadGoogleMaps() resolves.

import { detectBiome } from './biome.js';

const DIRECTIONS_TIMEOUT_MS = 15_000;

export class RouteService {
  init() {
    this.directions = new google.maps.DirectionsService();
    this.elevation  = new google.maps.ElevationService();
    this.geocoder   = new google.maps.Geocoder();
  }

  _calcRoute(origin, destination, mode) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('La solicitud de ruta tardó demasiado (timeout). Comprueba tu conexión.')),
        DIRECTIONS_TIMEOUT_MS
      );
      this.directions.route(
        { origin, destination, travelMode: mode },
        (res, status) => {
          clearTimeout(timer);
          if (status === 'OK') { resolve(res); return; }
          if (status === 'REQUEST_DENIED')
            reject(new Error('Directions API denegada. Activa "Directions API" en Google Cloud Console y asegúrate de tener facturación habilitada.'));
          else if (status === 'ZERO_RESULTS')
            reject(new Error('No se encontró ruta entre estos dos lugares.'));
          else if (status === 'NOT_FOUND')
            reject(new Error('No se reconoció uno de los lugares. Prueba con un nombre más completo.'));
          else
            reject(new Error(`Error de ruta: ${status}`));
        }
      );
    });
  }

  _getElevation(path, samples) {
    return new Promise((resolve, reject) => {
      this.elevation.getElevationAlongPath(
        { path, samples },
        (res, status) => {
          if (status === 'OK') { resolve(res); return; }
          if (status === 'REQUEST_DENIED')
            reject(new Error('Elevation API denegada. Activa "Elevation API" en Google Cloud Console.'));
          else
            reject(new Error(`Error al obtener altitudes (${status}).`));
        }
      );
    });
  }

  _geocode(address) {
    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK') { resolve(results[0]); return; }
        if (status === 'REQUEST_DENIED')
          reject(new Error('API key denegada. Activa "Geocoding API" o comprueba la facturación en Google Cloud Console.'));
        else
          reject(new Error(`No se encontró "${address}" (${status})`));
      });
    });
  }

  _extractPath(dir) {
    const path = [];
    dir.routes[0].legs.forEach(leg =>
      leg.steps.forEach(step => step.path.forEach(pt => path.push(pt)))
    );
    return path;
  }

  _totalDistanceM(dir) {
    return dir.routes[0].legs.reduce((s, l) => s + l.distance.value, 0);
  }

  // Straight-line interpolation between two geocoded points.
  // Used as fallback when Directions API can't find a route.
  async _straightLine(origin, destination) {
    const [a, b] = await Promise.all([
      this._geocode(origin),
      this._geocode(destination),
    ]);
    const la = a.geometry.location, lb = b.geometry.location;
    const distanceM = google.maps.geometry.spherical.computeDistanceBetween(la, lb);
    const N = 100;
    const path = Array.from({ length: N + 1 }, (_, i) => {
      const t = i / N;
      return new google.maps.LatLng(
        la.lat() + (lb.lat() - la.lat()) * t,
        la.lng() + (lb.lng() - la.lng()) * t,
      );
    });
    return {
      path,
      distanceM,
      startName: a.formatted_address,
      endName:   b.formatted_address,
    };
  }

  async buildRoute(origin, destination, onStatus) {
    console.log('[World Hike] buildRoute', { origin, destination });
    onStatus('Calculando ruta...');

    let path, distanceM, startName, endName;

    // 1. Try walking
    try {
      console.log('[World Hike] Trying walking route...');
      const dir = await this._calcRoute(origin, destination, google.maps.TravelMode.WALKING);
      path        = this._extractPath(dir);
      distanceM   = this._totalDistanceM(dir);
      startName   = dir.routes[0].legs[0].start_address;
      endName     = dir.routes[0].legs.at(-1).end_address;
    } catch (_walkErr) {
      // 2. Try driving
      try {
        console.log('[World Hike] Walking failed, trying driving...');
        onStatus('Ruta a pie no disponible, probando en coche...');
        const dir = await this._calcRoute(origin, destination, google.maps.TravelMode.DRIVING);
        path        = this._extractPath(dir);
        distanceM   = this._totalDistanceM(dir);
        startName   = dir.routes[0].legs[0].start_address;
        endName     = dir.routes[0].legs.at(-1).end_address;
      } catch (_driveErr) {
        // 3. Straight-line fallback (always works for any two places on Earth)
        console.log('[World Hike] Driving failed, falling back to straight line...');
        onStatus('Calculando ruta en línea recta con altitudes reales...');
        ({ path, distanceM, startName, endName } = await this._straightLine(origin, destination));
      }
    }

    onStatus('Obteniendo perfil de altitud...');
    const samples = Math.min(512, Math.max(80, Math.floor(distanceM / 150)));
    const elevResults = await this._getElevation(path, samples);

    onStatus('Detectando biomas y terreno...');

    const n = elevResults.length;
    const points = elevResults.map((r, i) => ({
      distanceM: (i / (n - 1)) * distanceM,
      elevation: r.elevation,
      lat:       r.location.lat(),
      lng:       r.location.lng(),
      biome:     null,
    }));

    // Sample biome every ~2% of points, then fill gaps
    const step = Math.max(1, Math.floor(n / 50));
    for (let i = 0; i < n; i += step) {
      const p = points[i];
      p.biome = detectBiome(p.lat, p.lng, p.elevation);
    }
    let last = 'temperate';
    for (const p of points) {
      if (p.biome) last = p.biome;
      else p.biome = last;
    }

    return { points, totalDistanceM: distanceM, startName, endName };
  }
}
