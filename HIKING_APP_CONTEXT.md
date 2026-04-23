# Fantasy Hiking App — Contexto del Proyecto

## Idea general

Construir una app inspirada en **Fantasy Hike** (app de fitness gamificada que mapea tus pasos reales sobre una ruta virtual de El Señor de los Anillos) pero con estas diferencias clave:

- **Ruta personalizable:** el usuario elige punto de partida y destino (cualquier lugar del mundo real)
- **Altitudes reales:** se obtiene el perfil de elevación real de la ruta mediante APIs de elevación
- **Mapa real:** se muestra la ruta en un mapa real (no ficticio)
- **Pasos de Apple Health:** el progreso a lo largo de la ruta se calcula con los pasos reales del usuario

## Referencia: Fantasy Hike

- App de Forge7 AB (iOS/Android)
- Mapea tus pasos reales sobre la ruta de la Comunidad del Anillo (Shire → Monte del Destino)
- Integración con Apple Health / Apple Watch
- Muestra posición en mapa, perfil de terreno, hitos desbloqueables, competición social
- Usa ~1300 pasos = 1 km (paso medio ~0.76 m)

## Arquitectura planificada

### Stack (pendiente confirmación del usuario)

| Decisión | Opciones | Estado |
|---|---|---|
| Plataforma | Web (HTML/JS) vs iOS nativo (Swift) | **Pendiente** |
| Integración pasos | HealthKit nativo vs export manual | **Pendiente** |
| API mapas | Google Maps / Mapbox / OpenStreetMap+Leaflet | **Pendiente** |
| API elevación | Google Elevation / OpenTopoData / Open-Meteo | **Pendiente** |

### Flujo principal (diseño preliminar)

1. Usuario introduce punto de partida y destino (texto o mapa)
2. App calcula la ruta real entre ambos puntos (routing API)
3. App obtiene el perfil de altitud real de la ruta (elevation API)
4. App muestra mapa con la ruta y gráfico de elevación
5. App lee pasos del usuario (Apple Health o entrada manual)
6. App convierte pasos → distancia → posición en la ruta
7. Usuario ve su avatar en el mapa avanzando por la ruta

### Conversión pasos → distancia

```
distancia_km = pasos * longitud_paso_media (default 0.76 m/paso)
```

## Estado del proyecto

### Rama de trabajo

`claude/fantasy-hiking-app-VdW7M` en `hectorgar2000/pokedex`

### Decisiones tomadas

*(vacío hasta confirmación del usuario)*

### Pendiente respuesta del usuario

1. ¿Web app o iOS nativo?
2. ¿Integración automática con Apple Health o importación manual?
3. ¿API keys disponibles para mapas/elevación?
4. ¿Qué visualizaciones quiere: mapa 2D, perfil de elevación, ambos?

## Historial de sesiones

### Sesión 1 — 2026-04-23

- Se estudió el concepto de Fantasy Hike
- Se creó este archivo de contexto
- Se esperan respuestas del usuario para definir el stack técnico
