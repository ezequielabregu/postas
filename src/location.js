// LocationSource: contrato común entre GPS real y posiciones simuladas.
// Cada lectura tiene la forma { lat, lon, accuracy, timestamp }.

function crearSuavizador(tamanoVentana = 3) {
  const historial = [];
  return function suavizar(lectura) {
    historial.push(lectura);
    if (historial.length > tamanoVentana) historial.shift();
    const lat = historial.reduce((s, l) => s + l.lat, 0) / historial.length;
    const lon = historial.reduce((s, l) => s + l.lon, 0) / historial.length;
    return { lat, lon, accuracy: lectura.accuracy, timestamp: lectura.timestamp };
  };
}

export class GeolocationSource {
  constructor({ accuracyThresholdMeters = 30 } = {}) {
    this.watchId = null;
    this.callback = null;
    this._statusCallback = null;
    this.suavizar = crearSuavizador();
    this.accuracyThresholdMeters = accuracyThresholdMeters;
  }

  start() {
    if (!('geolocation' in navigator)) {
      this._emitirEstado('unavailable', 'Este navegador no soporta geolocalización.');
      return;
    }
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this._onPosicion(pos),
      (err) => this._onError(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  onUpdate(callback) {
    this.callback = callback;
  }

  onStatus(callback) {
    this._statusCallback = callback;
  }

  _onPosicion(pos) {
    const lectura = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    };
    if (lectura.accuracy > this.accuracyThresholdMeters) {
      this._emitirEstado('poor-accuracy', `Precisión pobre: ${Math.round(lectura.accuracy)}m`);
    }
    const suavizada = this.suavizar(lectura);
    if (this.callback) this.callback(suavizada);
  }

  _onError(err) {
    if (err.code === err.PERMISSION_DENIED) {
      this._emitirEstado('permission-denied', 'Permiso de ubicación denegado.');
    } else {
      this._emitirEstado('unavailable', 'No se pudo obtener la ubicación.');
    }
  }

  _emitirEstado(tipo, mensaje) {
    if (this._statusCallback) this._statusCallback(tipo, mensaje);
  }
}

// SimulatedSource: no lee GPS, se alimenta a mano desde debug/simulator.html.
// No suaviza posiciones (serían teleports manuales, suavizar los distorsionaría).
export class SimulatedSource {
  constructor() {
    this.callback = null;
  }

  start() {}
  stop() {}

  onUpdate(callback) {
    this.callback = callback;
  }

  setPosition(lat, lon, accuracy = 5) {
    if (this.callback) {
      this.callback({ lat, lon, accuracy, timestamp: Date.now() });
    }
  }
}
