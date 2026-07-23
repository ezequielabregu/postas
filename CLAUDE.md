# CLAUDE.md

> Nombre de trabajo del proyecto: **"Postas"** (working title — renombrar libremente).
> Este archivo es el contexto persistente del proyecto para Claude Code. Léelo completo antes de escribir código. Las decisiones marcadas como **[ABIERTO]** están pendientes de definición por el artista y no deben resolverse unilateralmente: preguntar antes de asumir.
>
> **Prioridad número uno del proyecto ahora mismo: el stack más simple posible que funcione, porque hay poco tiempo.** Cada elección técnica de este documento está filtrada por esa prioridad. Si en algún momento Claude Code está por sumar una librería, un paso de build, o una capa de abstracción que no sea estrictamente necesaria para que el paso actual del roadmap (§10) funcione, la respuesta por defecto es no hacerlo — señalarlo como posible mejora de Fase 2 en vez de construirlo ahora.

## 1. Qué es esto

Una web app (PWA, mobile-first) que un usuario recorre caminando por Buenos Aires. Según su geolocalización en tiempo real, la app dispara audios distintos al acercarse a paradas específicas ("postas") de un recorrido predefinido. No hay pantalla que mirar mientras se camina: la experiencia es auditiva, la pantalla es sólo control/arranque.

No es una app de mapas con pines. Es una partitura espacial: la ciudad como grafo, el caminante como puntero que "ejecuta" un recorrido matemáticamente restringido (euleriano) mientras una capa narrativa sonora superpone la relación entre Xul Solar y Borges.

## 2. Marco conceptual (resumen operativo para diseño de features)

Esto no es decoración temática — cada concepto abajo tiene una traducción técnica, ver tabla en §9. Resumen:

- **Camino euleriano**: recorre cada arista una vez, empieza y termina en nodos distintos → deriva abierta, sin retorno.
- **Circuito euleriano**: igual pero vuelve al nodo de origen → eterno retorno; el punto es el mismo pero el oyente ya no.
- **Nodos de grado impar**: matemáticamente son los puntos que rompen la euleridad pura. Se tratan como umbrales narrativos ("Alephs"): momentos donde el audio colapsa la secuencia y suena simultáneamente lo ya recorrido. (Fase 2 — ver §3.)
- **Problema del cartero chino**: si el grafo real no cumple la condición de Euler, se duplican las aristas mínimas necesarias para forzarla. La segunda vez que se pisa una arista duplicada, el audio muta (referencia a Pierre Menard). (Fase 2.)
- **Grafo dirigido**: Buenos Aires tiene calles de sentido único → irreversibilidad literal en el recorrido. (Fase 2.)
- **Multiplicidad de circuitos (teorema BEST)**: el grafo suele admitir muchos circuitos eulerianos válidos, no uno solo. (Fase 3, opcional.)
- **Capa astrológica**: posiciones planetarias de Xul y Borges ancladas a coordenadas geográficas; los aspectos se sonifican como "cables" audibles entre dos postas. (Fase 2.)
- **Acumulación tipo Funes**: las capas de audio no se reemplazan al avanzar, se apilan. (Fase 2.)

## 3. Decisión de alcance — LEER ANTES DE EMPEZAR A CODEAR

Dos simplificaciones deliberadas para tener una base andando lo antes posible. Ambas son reversibles sin rehacer el resto de la app — son decisiones de "empezar simple", no compromisos permanentes.

**3.1 — Postas como puntos con radio, no aristas con geometría de calle real.** Para el MVP, cada posta es un punto (`lat`, `lon`, `radiusMeters`) y el audio se dispara por proximidad (distancia en línea recta al punto), no por intersección con el trazado real de la calle. Esto significa que, por ahora, la app no verifica que el usuario caminó literalmente por tal calle — verifica que llegó a tal posta. La estructura de grafo (qué posta conecta con cuál, orden del recorrido, nodos de grado impar) se mantiene igual en el diseño narrativo y en los datos; lo que se simplifica es sólo el mecanismo de detección. Subir a geofencing por arista real con buffers de polígono (Turf.js + `callejero.csv` vía Geopandas) queda documentado como mejora de Fase 2 en §10, no descartado — sólo no es necesario para arrancar.

**3.2 — El recorrido curado se escribe a mano, sin pipeline de datos.** `callejero.csv` no se toca en el MVP. Las coordenadas de cada posta se consiguen mirando Google Maps (click derecho sobre el punto → copiar coordenadas) y se escriben directo en un JSON. El pipeline Python + Geopandas + NetworkX (`callejero.csv` → grafo real, cartero chino, etc.) sigue siendo la herramienta correcta cuando cures el recorrido definitivo con muchas postas y quieras geometría de calle precisa — pero no bloquea tener algo funcionando hoy.

## 4. Stack tecnológico — versión mínima

Ezequiel conoce Python/Flask/Pandas/Geopandas/Scikit-learn/SQL/C++/Pure Data/JUCE/Apache/HTML/JS (nivel intermedio) — no conoce React/TypeScript/Vite. Y hay dos restricciones más que ya vienen de conversaciones anteriores y siguen aplicando: (a) evitar dependencias de un solo mantenedor o en estado experimental — tiene que poder resolver problemas él mismo; (b) ahora, además, **minimizar dependencias en general**, no sólo las riesgosas — cuantas menos piezas, más rápido se arranca y menos hay que aprender para poder seguir programando esto uno mismo.

- **Frontend**: JavaScript vanilla + HTML + CSS. Sin bundler, sin framework, sin build step. ES modules nativos.
- **Geoespacial**: **sin librería**. Una función de ~10 líneas (proyección equirectangular, ver snippet abajo) calcula la distancia en metros entre dos coordenadas — de sobra de precisión para radios de 10-20m a escala de caminata. Turf.js queda documentado para cuando se pase a geofencing de arista real con polígonos (Fase 2, §10) — no hace falta para postas puntuales.
- **Audio**: elementos `<audio>` de HTML nativos (`new Audio(url); audio.play()`) para el MVP — cero API nueva que aprender, reproducción simple e inmediata. Web Audio API (`GainNode`, `PannerNode`, `AudioBufferSourceNode`) recién entra cuando la Fase 2 necesite capas que se acumulan (Funes), mutación en repetición (Menard) o panning binaural — ninguna de esas hace falta para que suene un audio al llegar a una posta.
- **PWA**: `manifest.json` + `service-worker.js` — es lo primero que se corta si falta tiempo en la Fase 1 (ver §10), no bloquea nada del resto.
- **Datos**: un `postas.json` escrito a mano (§5). Nada de Python/Geopandas/NetworkX en el camino crítico del MVP — quedan documentados como mejora de Fase 2 para cuando haga falta procesar `callejero.csv` de verdad.
- **Backend**: ninguno para el MVP. Sigue siendo opcional (Flask) y sólo entra si se necesita guardar recorridos o sincronizar caminantes — ver §12, sigue sin resolver si hace falta.
- **Deploy**: GitHub Pages. Gratis, HTTPS automático (no negociable — lo exige `navigator.geolocation`), cero mantenimiento.

```javascript
// Distancia aproximada en metros entre dos coordenadas (válida a escala de barrio/ciudad)
function distanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const radLat1 = lat1 * Math.PI / 180;
  const radLat2 = lat2 * Math.PI / 180;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const latMedia = (radLat1 + radLat2) / 2;
  const x = dLon * Math.cos(latMedia);
  const y = dLat;
  return R * Math.sqrt(x * x + y * y);
}
```

**Principio de confiabilidad y simplicidad de dependencias (aplica a todo el proyecto)**: antes de sumar cualquier librería nueva, primero preguntar si esto se resuelve con JS/HTML nativo en pocas líneas — si sí, no sumar la librería. Cuando haga falta una librería igual, tiene que tener mantenimiento activo de más de una persona o una comunidad real detrás, nunca proyectos de un solo mantenedor ni marcados como "experimental" (motivo: Ezequiel tiene que poder resolver él mismo cualquier problema que aparezca, y cuantas menos piezas ajenas haya, más rápido se entiende y se arregla todo el sistema).

## 5. Modelo de datos — versión mínima

```json
// postas.json
{
  "type": "circuit",
  "postas": [
    {
      "id": "posta_01",
      "lat": -34.6037,
      "lon": -58.3816,
      "radiusMeters": 15,
      "audioFile": "audio/posta_01.mp3"
    }
  ]
}
```

Ruta de evolución (Fase 2, no construir ahora): este esquema crece a algo con `nodes`/`edges` separados, geometría real de calle por arista, `isAleph`, `astroAnchor`, `duplicatedFor`/`variantAudioTrackId` para el cartero chino — todo lo que se había diseñado en versiones anteriores de este documento sigue siendo el destino, sólo que se construye cuando el MVP puntual ya esté probado y funcionando, no antes.

**Estado actual**: el recorrido de juguete fue reemplazado por el primer recorrido curado real, en Recoleta — 7 postas con coordenadas reales en `data/postas.json` (Museo Xul Solar, Casa Museo Ricardo Rojas, Fundación Internacional Jorge Luis Borges, Casa Virasoro, Pje Bollini 2233, Museo del Libro y de la Lengua, Biblioteca Nacional Mariano Moreno). El esquema (`id`, `lat`, `lon`, `radiusMeters`, `audioFile`, más un `label` legible agregado para mostrar en el simulador) no cambió respecto al ejemplo de arriba.


## 6. Arquitectura de módulos

### 6.1 `location.js`
- Interfaz `LocationSource` (contrato: `start()`, `stop()`, `onUpdate(callback)` — el callback recibe `{ lat, lon, accuracy, timestamp }`), con dos implementaciones:
  - **`GeolocationSource`**: wrapper sobre `navigator.geolocation.watchPosition` con `enableHighAccuracy: true`.
  - **`SimulatedSource`**: alimenta la misma interfaz con coordenadas fijadas a mano (§6.4) — el resto de la app no distingue una fuente de otra.
- Posición suavizada (media móvil simple) para reducir salto por jitter. Maneja estados: permiso denegado, GPS no disponible, precisión pobre.

### 6.2 `geofencing.js`
- Para cada posta en `postas.json`, calcula `distanciaMetros(posicionActual, posta)` (función de §4) y dispara `onPostaReached(postaId)` cuando la distancia es menor a `radiusMeters`.
- Debounce: exigir 2-3 lecturas consecutivas dentro del radio antes de disparar, para no reaccionar a un salto de jitter GPS aislado.

### 6.3 `audio-engine.js`
- `reproducirPosta(postaId)`: crea (o reutiliza) un `new Audio(postas[postaId].audioFile)` y lo reproduce.
- Debe inicializarse tras un gesto explícito del usuario (botón "Comenzar recorrido") — los navegadores móviles bloquean autoplay de audio sin interacción previa. No negociable.
- Sin capas, sin crossfade, sin mutación entre postas — un trigger, un audio. Eso sigue siendo Fase 2.
- **Excepción agregada**: una pista de ambiente en loop (`ambient_1.mp3`) arranca con el mismo gesto de "Comenzar recorrido" y suena de fondo todo el recorrido, por debajo de los audios de posta — es la única forma de capas que existe hoy, y es deliberadamente simple: volumen fijo hardcodeado en el constructor de `AudioEngine` (sin control de UI, decisión explícita), sin mezcla dinámica ni ducking.

### 6.4 `debug/simulator.html` — simulador de escritorio

Empezó como simulador mínimo (botones + campos manuales) y creció bastante más allá de lo que describía esta sección originalmente, porque resultó ser la única forma de probar el geofencing y el mix de audio sin salir a caminar. **Todo lo de acá vive únicamente en este archivo de debug — `index.html`, la pantalla real del caminante, sigue minimalista y no tiene nada de esto.**

- **Carta astral como visualización**: un SVG circular tipo rueda zodiacal (anillos concéntricos, 12 líneas radiales), con la carta astrológica real que Xul Solar le dibujó a Borges (`assets/carta_borges.png`) superpuesta como fondo semi-transparente, recortada a un círculo. Las 7 postas se proyectan dentro de ese círculo según sus coordenadas reales, con una proyección equirectangular local (misma corrección `cos(latitud)` que `distanciaMetros`) que preserva las distancias relativas reales — se ven espaciadas "como en un mapa", no en posiciones arbitrarias.
- **Caminata automática simulada**: un punto interpola en línea recta entre las postas del circuito a una velocidad ajustable (slider, 0.5–50 m/s), alimentando `SimulatedSource` con lat/lon real de cada paso — dispara el geofencing y el audio exactamente igual que GPS real en movimiento. Deja una línea trazada (SVG `<path>`) mostrando el recorrido acumulado; los saltos manuales (ver abajo) rompen la línea en vez de conectarla.
- **Orden de visita aleatorio**: cada vez que se carga la página, el orden en que la caminata automática visita las 7 postas se mezcla (Fisher-Yates) — no es el mismo circuito siempre. Esto es un placeholder simple para cuando el recorrido sea sobre un grafo real con más de un circuito válido (teorema BEST, Fase 3, §9).
- **Controles manuales (respaldo)**, colapsados en un `<details>`: un botón por posta (salta directo a esa posta y fuerza el disparo del audio, vía `Geofencing.resetPosta()`) + campos de lat/lon libres — para probar puntos puntuales sin depender de la caminata automática.
- Esto adelanta, como herramienta de desarrollo, dos ítems que estaban pensados para más adelante: la reproducción automática interpolada con mapa (Fase 2, §10) y la visualización tipo carta astral (Fase 3, §9/§10) — ver nota en §9 y §10.


## 7. Restricciones técnicas críticas — no ignorar

1. **Ejecución en segundo plano en iOS/Android**: si el usuario bloquea la pantalla, `watchPosition` se degrada. Mitigación: Wake Lock API (`navigator.wakeLock`) + pedir que mantenga la pantalla activa. Capacitor como alternativa nativa, sólo evaluar si el testing real lo exige.
2. **Autoplay de audio**: requiere gesto de usuario. El flujo empieza siempre con una interacción explícita ("Empezar", tap).
3. **Jitter de GPS**: 5-15m de error típico, peor bajo edificios/árboles. El radio de posta (§5) es la mitigación — probar en campo antes de asumir que el valor elegido funciona.
4. **Datos de ubicación son sensibles**: todo el procesamiento queda en el cliente, nunca se envían coordenadas a un backend salvo que se pida como feature explícita.
5. **HTTPS obligatorio**: `navigator.geolocation` y la reproducción de audio no funcionan sobre HTTP plano en navegadores modernos — de ahí GitHub Pages desde el primer commit (§10, paso 0).

## 8. Estructura de carpetas — versión mínima

```
postas/
├── CLAUDE.md
├── data/
│   └── postas.json
├── audio/
├── assets/
│   └── carta_borges.png
├── debug/
│   └── simulator.html
├── index.html
├── manifest.json
├── service-worker.js
└── src/
    ├── location.js
    ├── geofencing.js
    ├── audio-engine.js
    └── ui.js
```

Carpetas que existían en versiones anteriores de este documento (`scripts/`, `tools/`, `pd/`) se suman recién en Fase 2 cuando hagan falta — no crearlas de entrada.

## 9. Mapeo conceptual → técnico

| Concepto | Estado en el MVP | Traducción técnica futura (Fase 2) |
|---|---|---|
| Posta / nodo | Implementado — punto + radio en `postas.json` | Se mantiene, se le suma geometría de arista real |
| Circuito/camino euleriano | Estructura narrativa del orden de postas | `route.type`, validación formal de grado par/impar |
| Nodo de grado impar / Aleph | No implementado | Colapso simultáneo de capas ya activadas |
| Cartero chino / Menard | No implementado | Mutación de audio en aristas repetidas |
| Calles de sentido único | No implementado | Grafo dirigido, geofencing direccional |
| Acumulación Funes | No implementado | Capas de audio que no se cortan (Web Audio API) |
| Capa astrológica | No implementado | `astro-config.json`, aspectos como "cables" audibles |
| Carta astral del recorrido | Implementado como herramienta de debug (SVG, `debug/simulator.html`) — no en `index.html` | Pasar la visualización a la pantalla real (si se decide mostrarla al caminante) y/o migrar a D3.js si hace falta más interactividad |


## 10. Roadmap

**Fase 1 — MVP mínimo, paso a paso**

Estado actual: pasos 0–6 completos y probados vía simulador. Falta el paso 7 (prueba de campo real caminando afuera) — sigue pendiente, es lo próximo antes de dar la Fase 1 por cerrada.

0. ✅ **Andamiaje mínimo**: hecho, y además ya deployado a GitHub Pages (`https://ezequielabregu.github.io/postas/`) — el paso de deploy que originalmente quedaba para el final ya está en producción.
1. ✅ **Coordenadas reales**: `navigator.geolocation.watchPosition` mostrando lat/lon y precisión en pantalla, confirmado funcionando (probado también un falso negativo en el subte, sin señal — esperable, no es un bug).
2. ✅ **`LocationSource` + simulador**: hecho, y el simulador terminó creciendo mucho más allá de "mínimo" (ver §6.4).
3. ✅ **`postas.json` + geofencing**: ya no son postas de juguete — son las 7 postas reales curadas en Recoleta (ver §5, §11).
4. ✅ **Reproducción de audio**: hecho, con el agregado no planeado de una pista de ambiente en loop (§6.3).
5. ✅ **UX de arranque**: gesto explícito, estado en vivo, funcionando.
6. ✅ **Ajuste de radio y debounce**: hecho usando el simulador (que ahora además simula caminata automática, no sólo botones puntuales).
7. ⏳ **Primera prueba de campo real**: **pendiente** — todavía no se confirmó una caminata afuera con señal real (sólo un intento fallido en el subte). Es el próximo paso antes de considerar cerrada la Fase 1.
8. **PWA** (`manifest.json` + `service-worker.js`, cache de audio offline) — sigue siendo el primer punto a cortar si falta tiempo, no bloquea nada de lo anterior. No empezado.

Nota: dos ítems que estaban pensados como mejoras de Fase 2/Fase 3 ya se adelantaron *dentro del simulador de debug* (reproducción automática interpolada, visualización tipo carta astral — ver §6.4, §9) porque resultaron necesarios para poder probar sin salir a caminar. Esto no cambia la prioridad del paso 7 real ni adelanta esas features a `index.html`.

**Fase 2 — profundización (no antes de tener el paso 7 hecho)**
- Geofencing de arista real: Turf.js + buffers de polígono sobre geometría de calle verdadera.
- Pipeline `callejero.csv` → grafo real: Python + Geopandas + NetworkX (`eulerize()` para cartero chino).
- Herramienta de curaduría de ruta: script `.py` + Folium para elegir postas/aristas reales sobre un mapa.
- Web Audio API: capas tipo Funes, mutación tipo Menard, colapso en nodos Aleph.
- Direccionalidad en calles de sentido único (grafo dirigido).
- Capa astrológica real (`astro-config.json`, aspectos como audio) — distinto de la imagen de fondo ya usada en el simulador, que es sólo estética (ver §11).
- Backend (Flask) si hace falta guardar recorridos o sincronizar caminantes — ver §12, todavía sin resolver si hace falta.

**Fase 3 — refinamiento**
- Panning binaural (`PannerNode` HRTF + orientación del dispositivo).
- Grafo dual ("capa Xul").
- Conteo de circuitos alternativos (teorema BEST) — hoy el simulador sólo mezcla el orden al azar (§6.4), no calcula circuitos válidos.
- Llevar la visualización tipo carta astral a la pantalla real, si se decide mostrarla al caminante (hoy sólo existe en el simulador de debug).
- Evaluación de Capacitor si el testing de campo muestra problemas de background tracking.

## 11. Decisiones abiertas — preguntar antes de asumir

- **[ABIERTO] Carta astrológica**: ¿esqueleto verificable (posiciones planetarias reales por fecha) + capa apócrifa explícita encima, o carta completamente inventada a la manera Xul? No afecta la arquitectura de datos, sólo el contenido — es Fase 2, no urgente.
- - **Alcance geográfico real del primer recorrido curado — RESUELTO**: Recoleta. 7 postas: Museo Xul Solar, Casa Museo Ricardo Rojas, Fundación Internacional Jorge Luis Borges, Casa Virasoro, Pje Bollini 2233, Museo del Libro y de la Lengua, Biblioteca Nacional Mariano Moreno. Coordenadas reales en `data/postas.json`. Sigue pendiente el pipeline de `callejero.csv` para cuando se pase a geometría de calle real (Fase 2) — eso no cambió.

- **[ABIERTO] PWA pura vs. Capacitor**: evaluar según resultado de pruebas de campo (§7.1).
- **[ABIERTO] Recorridos independientes vs. colectivos/sincronizados** para los 30+ usuarios simultáneos — determina si hace falta backend con WebSockets. Ver §12. Nota: la opción "independientes" es también la más simple (cero backend), consistente con la prioridad actual de simplicidad.

## 12. Despliegue

GitHub Pages y el VPS (Hostinger, Ubuntu) no son intercambiables — dependen de si hay backend:

- **Mientras sea estático** (todo el MVP de la Fase 1, y buena parte de la Fase 2): **GitHub Pages**. Gratis, HTTPS automático, cero mantenimiento.
- **En cuanto se agregue un backend Flask**: pasa a ser necesario el VPS. **Apache** como reverse proxy hacia Flask con Gunicorn + `certbot` para HTTPS — aprovecha lo que Ezequiel ya conoce, no hace falta nginx.

### Robustez con múltiples usuarios simultáneos (mínimo 30) — todavía sin resolver

Si los 30 caminantes son **independientes** (cada uno su propio recorrido, sin relación entre dispositivos): no hace falta backend para esto — cada teléfono corre todo localmente, GitHub Pages sirviendo 30 páginas estáticas simultáneas es un no-evento. Si es una **experiencia colectiva sincronizada** (como "detox" — lo que activa un participante afecta a los demás): hace falta un servidor WebSocket, con tecnología madura (Flask-SocketIO o el módulo `websockets` de Python) — 30 conexiones es carga mínima para cualquier VPS modesto.

## 13. Cómo trabajar en este repo

- **Filtro obligatorio antes de sumar cualquier dependencia nueva**: (1) ¿se resuelve esto en pocas líneas de JS/HTML nativo? Si sí, no sumar nada. (2) Si hace falta una librería igual, ¿tiene mantenimiento activo de más de una persona/comunidad real? Si no, no usarla y avisar. Este filtro aplica en todo momento, no sólo para el audio (motivo original: Ezequiel tiene que poder resolver problemas él mismo).
- Priorizar tener algo funcionando de punta a punta cuanto antes por sobre completitud — no construir Fase 2/3 mientras la Fase 1 no esté caminada en la calle al menos una vez.
- No commitear archivos de audio pesados sin revisar tamaño.
- Mantener todo el procesamiento de geolocalización en el cliente (§7.4).