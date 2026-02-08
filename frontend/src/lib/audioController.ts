/**
 * Central audio controller - ensures only ONE audio plays at a time,
 * prevents overlapping/resonating voices, and provides stop control.
 */

const activeAudios: HTMLAudioElement[] = [];

/**
 * Stop ALL currently playing audio and clear the queue.
 * Call this before playing any new audio to prevent overlap.
 */
export function stopAllAudio(): void {
  activeAudios.forEach((audio) => {
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    } catch {
      // Ignore errors from already-unloaded audio
    }
  });
  activeAudios.length = 0;
}

/**
 * Register an audio element for tracking. It will be stopped when stopAllAudio() is called.
 */
export function registerAudio(audio: HTMLAudioElement): void {
  if (!activeAudios.includes(audio)) {
    activeAudios.push(audio);
    audio.addEventListener(
      "ended",
      () => {
        const idx = activeAudios.indexOf(audio);
        if (idx >= 0) activeAudios.splice(idx, 1);
      },
      { once: true }
    );
  }
}

/**
 * Play an audio URL with proper sequencing. Stops any existing audio first.
 * Returns a promise that resolves when playback completes, or rejects if stopped.
 */
export function playAudioExclusive(
  url: string,
  onStop?: () => void
): { audio: HTMLAudioElement; promise: Promise<void> } {
  stopAllAudio();

  const audio = new Audio(url);
  registerAudio(audio);

  const promise = new Promise<void>((resolve, reject) => {
    audio.addEventListener(
      "ended",
      () => {
        const idx = activeAudios.indexOf(audio);
        if (idx >= 0) activeAudios.splice(idx, 1);
        resolve();
      },
      { once: true }
    );

    audio.addEventListener(
      "pause",
      () => {
        if (audio.currentTime > 0 && audio.currentTime < (audio.duration || Infinity) - 0.1) {
          onStop?.();
          reject(new Error("stopped"));
        }
      },
      { once: true }
    );
  });

  audio.play().catch((err: unknown) => {
    reject(err);
  });

  return { audio, promise };
}
