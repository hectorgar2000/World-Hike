# World Hike App — Contexto del Proyecto

## Idea general

App inspirada en **Fantasy Hike** (app de fitness gamificada de Forge7 AB que mapea tus pasos reales sobre la ruta de El Señor de los Anillos) pero con estas diferencias clave:

- **Ruta personalizable:** el usuario elige punto de partida y destino (cualquier lugar del mundo real)
- **Altitudes reales:** perfil de elevación real mediante Google Elevation API
- **Visualización 2D side-scroll:** terreno que avanza mientras caminas, con fondo y decoraciones que cambian por bioma
- **Pasos de Apple Health:** progreso calculado con pasos reales (web v1: manual + XML import; iOS v2: HealthKit automático)

## Referencia: Fantasy Hike

- App de Forge7 AB (iOS/Android)
- Mapea pasos reales sobre la ruta Shire → Monte del Destino (LOTR)
- Integración con Apple Health / Apple Watch
- Muestra posición en mapa, hitos desbloqueables, competición social
- ~1300 pasos = 1 km (paso medio ~0.76 m)

## Decisiones de arquitectura (confirmadas)

| Decisión | Elección | Notas |
|---|---|---|
| Repositorio | `hectorgar2000/pokedex` (renombrar a world-hike manualmente en GitHub Settings) | No se puede renombrar por API |
| Plataforma v1 | **Web app** (HTML/CSS/JS, sin build tools) | Después → iOS + Android |
| Plataforma v2 | iOS nativo (Swift/SwiftUI) + Android | HealthKit automático en v2 |
| Integración pasos | Web: manual + Apple Health XML import | iOS v2: HealthKit automático |
| API mapas | **Google Maps JavaScript API** (usa API key del usuario) | DirectionsService + ElevationService, sin CORS issues |
| API elevación | **Google Elevation API** (via Maps JS SDK) | Incluida en Maps JS API |
| Biomas | Detección por lat/lng + elevación (reglas geográficas) | Galicia, Meseta, Mediterráneo, Alpino, Highland, Templado |

## Visualización (diseño confirmado)

### Pantalla principal: canvas 2D side-scroll

```
┌─────────────────────────────────────────────┐
│  HEADER: [← volver] [ruta] [0.0 / 800 km]  │
├─────────────────────────────────────────────┤
│                                             │
│  [Cielo - gradiente por bioma]              │
│                                             │
│  [Montañas fondo - parallax 0.2x]           │
│                                             │
│        🚶 (character fijo al 30%)           │
│  ___/\___/\__/\__/\_________                │
│  [Terreno con elevación real - bezier]      │
│  [Decoraciones: árboles, rocas por bioma]   │
├─────────────────────────────────────────────┤
│  [Barra de progreso]                        │
├─────────────────────────────────────────────┤
│  pasos | km hechos | km restantes | m sube  │
│  [Input pasos] [+]                          │
│  [Importar Apple Health XML]                │
└─────────────────────────────────────────────┘
```

### Comportamiento de scroll

- Character fijo al 30% del ancho de pantalla
- El terreno avanza de derecha a izquierda mientras el personaje camina
- Usuario puede **arrastrar a la izquierda** para ver el camino recorrido
- **No puede arrastrar a la derecha** más allá de la posición actual
- Scroll de rueda (desktop) para hacer zoom del terrain view

### Biomas y temas visuales

| Bioma | Regiones | Cielo | Terreno | Decoraciones |
|---|---|---|---|---|
| `galicia` | Galicia, Asturias, Cantabria, Norte Portugal | Verde grisáceo con niebla | Verde oscuro | Pinos, robles |
| `meseta` | Castilla, interior España/Portugal | Dorado/amarillo | Ocre, marrón dorado | Matorral seco, hierba |
| `mediterranean` | Andalucía, Levante, Sur Francia, Italia | Azul intenso | Arena/barro | Cipreses, olivos |
| `alpine` | Pirineos, Alpes, >2200m | Azul oscuro/claro | Gris/blanco | Rocas, manchas de nieve |
| `highland` | Zonas montañosas 1000-2200m | Azul grisáceo | Verde oscuro/gris | Pinos, rocas |
| `temperate` | Centro Europa, UK, genérico | Azul cielo | Verde | Árboles variados |

## Estructura de archivos

```
/
├── index.html
├── HIKING_APP_CONTEXT.md
└── assets/
    ├── css/
    │   └── style.css
    └── js/
        ├── main.js           # Controlador principal, coordinación de pantallas
        ├── maps-loader.js    # Carga dinámica de Google Maps JS API
        ├── route-service.js  # Routing + Elevation via Google Maps JS API
        ├── terrain-renderer.js # Canvas 2D side-scroll con biomas y parallax
        ├── biome.js          # Detección de bioma por lat/lng/elevation + temas
        ├── steps-tracker.js  # Contador de pasos + import Apple Health XML
        └── storage.js        # Persistencia en localStorage
```

## Conversión pasos → distancia

```
PASO_MEDIO = 0.762 m  (~2.5 pies, media adulto)
distancia_km = pasos_totales × 0.762 / 1000
```

## Flujo de la app

1. Usuario entra API key de Google Maps (guardada en localStorage)
2. Usuario introduce punto de partida y destino (texto libre)
3. App llama a `DirectionsService` (modo walking) → obtiene ruta real
4. App llama a `ElevationService.getElevationAlongPath` → perfil de elevación (hasta 512 puntos)
5. App detecta bioma en puntos clave de la ruta (lat/lng/elevation)
6. Se muestra el canvas 2D con la ruta cargada
7. Usuario añade pasos manualmente (o importa XML de Apple Health)
8. El personaje avanza en el mapa según los pasos acumulados
9. El estado se guarda automáticamente en localStorage cada 30s

## Estado del proyecto

### Rama de trabajo

`claude/fantasy-hiking-app-VdW7M` en `hectorgar2000/pokedex`

### Pendiente (usuario)

- Renombrar el repo a `world-hike` en GitHub Settings → General → Repository name

### Pendiente técnico (v2)

- App iOS nativa con HealthKit para integración automática de pasos
- App Android nativa con Google Fit / Health Connect
- Backend para guardar progreso en la nube (compartir con amigos)
- Hitos y logros al pasar por lugares importantes de la ruta
- Modo multijugador (ver progreso de amigos en el mismo mapa)

## Historial de sesiones

### Sesión 1 — 2026-04-23

- Estudiado el concepto de Fantasy Hike (Forge7 AB, LOTR-themed, steps → Shire to Mount Doom)
- Definidas todas las decisiones de arquitectura con el usuario
- Creado este archivo de contexto
- Iniciada implementación v1 (web app)
