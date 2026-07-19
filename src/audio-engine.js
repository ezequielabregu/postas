// Reproducción simple por posta — sin capas, sin crossfade, sin mutación (eso es Fase 2).
export class AudioEngine {
  constructor(postas) {
    this.audiosPorPosta = new Map(postas.map((p) => [p.id, new Audio(p.audioFile)]));
    this.desbloqueado = false;
  }

  // Llamar dentro del gesto de usuario (click de "Comenzar recorrido") para
  // desbloquear el autoplay de audio en navegadores móviles. No negociable (CLAUDE.md §7.2).
  desbloquear() {
    if (this.desbloqueado) return;
    for (const audio of this.audiosPorPosta.values()) {
      audio.play().then(() => audio.pause()).catch(() => {});
      audio.currentTime = 0;
    }
    this.desbloqueado = true;
  }

  reproducirPosta(postaId) {
    const audio = this.audiosPorPosta.get(postaId);
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch((err) => console.warn(`No se pudo reproducir ${postaId}:`, err));
  }
}
