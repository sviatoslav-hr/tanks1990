export enum SoundType {
    EXPLOSION = '8bit_bomb_explosion',
    SHOOTING = 'cannon_fire',
}

const VOLUME_SCALE = 0.3;

const soundsCache = new Map<SoundType, HTMLAudioElement>();
let currentVolume = 0.3 * VOLUME_SCALE;

export function preloadSounds(): void {
    soundsCache.set(SoundType.EXPLOSION, getSound(SoundType.EXPLOSION));
    soundsCache.set(SoundType.SHOOTING, getSound(SoundType.SHOOTING));
}

export function playSound(type: SoundType): void {
    const cached = soundsCache.get(type);
    if (cached && !isPlaying(cached)) {
        cached.play();
        return;
    }
    const sound = getSound(type);
    sound.play();
}

export function getVolume(): number {
    return Math.min(currentVolume / VOLUME_SCALE, 1);
}

export function setVolume(volume: number): void {
    currentVolume = volume * VOLUME_SCALE;
    for (const [_, sound] of soundsCache) {
        sound.volume = currentVolume;
    }
}

function getSound(type: SoundType): HTMLAudioElement {
    const src = `./sounds/${type}.wav`;
    const sound = new Audio(src);
    sound.volume = currentVolume;
    sound.load();
    return sound;
}

function isPlaying(sound: HTMLAudioElement): boolean {
    return (
        sound.currentTime > 0 &&
        !sound.paused &&
        !sound.ended &&
        sound.readyState > 2
    );
}
