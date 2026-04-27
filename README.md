# World Hike

App de fitness gamificada inspirada en **Fantasy Hike** (Forge7 AB). Convierte tus pasos reales en una aventura visual: elige cualquier ruta del mundo real y el personaje avanza por un terreno 2D side-scroll con biomas, parallax y elevación real.

## Características v1 (Web App)

- Ruta personalizable: cualquier punto de partida y destino del mundo real
- Perfil de elevación real vía **Google Elevation API**
- Visualización 2D side-scroll con terreno, biomas y parallax
- Registro de pasos manual o importación de XML de Apple Health
- Persistencia del progreso en localStorage
- Detección automática de bioma (galicia, meseta, mediterráneo, alpino, highland, templado)

## Tecnologías

- HTML / CSS / JavaScript vanilla (sin build tools)
- Google Maps JavaScript API (DirectionsService + ElevationService + Places Autocomplete)
- Canvas 2D

## Uso

1. Abre `index.html` en el navegador
2. Introduce tu API key de Google Maps
3. Define punto de partida y destino
4. Empieza a caminar y registra tus pasos

## Conversión pasos → distancia

```
1 paso = 0.762 m  (media adulto)
distancia_km = pasos × 0.762 / 1000
```

## Roadmap

- **v2:** App iOS nativa (HealthKit automático) + Android (Health Connect)
- Backend para progreso en la nube y modo multijugador
- Hitos y logros por lugares de la ruta
