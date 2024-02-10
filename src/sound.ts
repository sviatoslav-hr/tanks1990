export enum SoundType {
    EXPLOSION = "8bit_bomb_explosion",
    SHOOTING = "cannon_fire",
}

const soundsCache = new Map<SoundType, HTMLAudioElement>();

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

function getSound(type: SoundType): HTMLAudioElement {
    const src = `./sounds/${type}.wav`;
    const sound = new Audio(src);
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
