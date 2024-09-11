import { Result } from './common';
import { getStoredVolume, storeVolume } from './storage';

export enum SoundType {
    EXPLOSION = '8bit_bomb_explosion',
    SHOOTING = 'cannon_fire',
}

const VOLUME_SCALE = 0.3;
const soundsCache = new Map<SoundType, Sound>();
let currentVolume = 0.3 * VOLUME_SCALE;

export async function preloadSounds(): Promise<void> {
    const volume = getStoredVolume(localStorage);
    if (volume != null) {
        currentVolume = volume * VOLUME_SCALE;
    }
    const promises: Promise<Result<void>>[] = [];
    for (const type of Object.values(SoundType)) {
        const sound = Sound.fromType(type);
        soundsCache.set(type, sound);
        promises.push(sound.load());
    }
    const results = await Promise.all(promises);
    for (const result of results) {
        if (result.isErr()) {
            console.error(result.context('Failed to preload sound').err);
        }
    }
}

export function playSound(type: SoundType): void {
    const cached = soundsCache.get(type);
    if (cached && !cached.isPlaying) {
        cached.play();
        return;
    }
    const sound = Sound.fromType(type);
    soundsCache.set(type, sound);
    sound.load().then((res) => {
        if (res.isOk()) {
            sound.play();
        } else {
            console.error(res.context(`Failed to play sound: ${type}`).err);
        }
    });
}

export function getVolume(): number {
    return Math.min(currentVolume / VOLUME_SCALE, 1);
}

export function setVolume(volume: number): void {
    currentVolume = volume * VOLUME_SCALE;
    storeVolume(localStorage, volume);
    for (const [_, sound] of soundsCache) {
        sound.volume = currentVolume;
    }
}

class Sound {
    private loaded = false;

    constructor(readonly audio: HTMLAudioElement) {}

    static fromType(type: SoundType): Sound {
        const src = `./sounds/${type}.wav`;
        const audio = new Audio(src);
        audio.volume = currentVolume;
        return new Sound(audio);
    }

    get volume(): number {
        return this.audio.volume;
    }

    set volume(volume: number) {
        this.audio.volume = volume;
    }

    play(): void {
        if (this.loaded) {
            this.audio.play();
        } else {
            console.error(`Sound not loaded: "${this.audio.src}"`);
        }
    }

    get isPlaying(): boolean {
        return (
            this.audio.currentTime > 0 &&
            !this.audio.paused &&
            !this.audio.ended &&
            this.audio.readyState > 2
        );
    }

    async load(): Promise<Result<void>> {
        if (this.loaded) {
            console.warn(`Sound already loaded: "${this.audio.src}"`);
            return Result.Ok();
        }
        const result = await Result.promise<void>((resolve, reject) => {
            const onerror = (event: ErrorEvent) => {
                this.audio.removeEventListener('error', onerror);
                this.audio.removeEventListener('canplaythrough', onload);
                reject(event.error ?? new Error('Unknown error'));
            };

            const onload = () => {
                this.audio.removeEventListener('error', onerror);
                this.audio.removeEventListener('canplaythrough', onload);
                this.loaded = true;
                resolve();
            };

            this.audio.addEventListener('error', onerror);
            this.audio.addEventListener('canplaythrough', onload);
            this.audio.load();
        });
        return result.context(`Failed to load sound: "${this.audio.src}"`);
    }
}
