// Dynamically loads the Google Maps JavaScript API once, returns the google object.

let _promise = null;

export function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (_promise) return _promise;

  _promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => {
      _promise = null;
      reject(new Error('No se pudo cargar Google Maps. Verifica tu API key y que Directions API y Elevation API estén activadas.'));
    };
    document.head.appendChild(script);
  });

  return _promise;
}
