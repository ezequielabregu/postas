import { Geofencing } from './geofencing.js';
import { AudioEngine } from './audio-engine.js';

export async function initApp(locationSource, dom) {
  // Resolver data/ y audio/ contra la raíz del proyecto (src/ está un nivel abajo),
  // así funciona igual si el módulo se carga desde index.html o desde debug/simulator.html.
  const baseUrl = new URL('../', import.meta.url);
  const dataUrl = new URL('data/postas.json', baseUrl);

  const respuesta = await fetch(dataUrl);
  const ruta = await respuesta.json();
  const postas = ruta.postas.map((p) => ({
    ...p,
    audioFile: new URL(p.audioFile, baseUrl).href,
  }));

  const ambientUrl = new URL('audio/ambient_1_mono.mp3', baseUrl).href;

  const geofencing = new Geofencing(postas);
  const audioEngine = new AudioEngine(postas, ambientUrl);


  dom.botonComenzar.addEventListener('click', () => {
    audioEngine.desbloquear();
    dom.botonComenzar.disabled = true;
    dom.estado.textContent = 'Buscando señal...';
    locationSource.start();
  });

  if (locationSource.onStatus) {
    locationSource.onStatus((tipo, mensaje) => {
      dom.estado.textContent = mensaje;
    });
  }

  geofencing.onPostaReached = (postaId) => {
    dom.estado.textContent = `Posta alcanzada: ${postaId}`;
    audioEngine.reproducirPosta(postaId);
  };

  locationSource.onUpdate((posicion) => {
    if (dom.lat) dom.lat.textContent = posicion.lat.toFixed(6);
    if (dom.lon) dom.lon.textContent = posicion.lon.toFixed(6);
    if (dom.accuracy) dom.accuracy.textContent = `${Math.round(posicion.accuracy)}m`;
    if (dom.estado && dom.estado.textContent === 'Buscando señal...') {
      dom.estado.textContent = 'Reproduciendo';
    }
    geofencing.evaluar(posicion);
  });

  return { geofencing, audioEngine, postas };
}
