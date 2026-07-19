// Distancia aproximada en metros entre dos coordenadas (proyección equirectangular,
// válida a escala de barrio/ciudad — de sobra de precisión para radios de 10-20m).
export function distanciaMetros(lat1, lon1, lat2, lon2) {
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

export class Geofencing {
  constructor(postas, { lecturasParaConfirmar = 2 } = {}) {
    this.postas = postas;
    this.lecturasParaConfirmar = lecturasParaConfirmar;
    this.contadorDentro = new Map(postas.map((p) => [p.id, 0]));
    this.onPostaReached = null;
  }

  evaluar({ lat, lon }) {
    for (const posta of this.postas) {
      const distancia = distanciaMetros(lat, lon, posta.lat, posta.lon);
      const dentro = distancia <= posta.radiusMeters;
      const contadorActual = this.contadorDentro.get(posta.id);

      if (dentro) {
        const nuevoContador = contadorActual + 1;
        this.contadorDentro.set(posta.id, nuevoContador);
        if (nuevoContador === this.lecturasParaConfirmar && this.onPostaReached) {
          this.onPostaReached(posta.id, distancia);
        }
      } else {
        this.contadorDentro.set(posta.id, 0);
      }
    }
  }
}
