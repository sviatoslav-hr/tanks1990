import {Result, wrapError} from '#/common';
import {clamp} from '#/math';
import {getStoredVolume, storeVolume} from '#/storage';

export enum SoundType {
    EXPLOSION = '8bit_bomb_explosion',
    SHOOTING = 'cannon_fire',
}

const VOLUME_SCALE = 0.3;
// TODO: avoid using globals
const soundsCache = new Map<SoundType, Sound[]>();
let currentVolume = 1 * VOLUME_SCALE;
const audioContext = new AudioContext();

export async function preloadSounds(): Promise<void> {
    const volume = getStoredVolume(localStorage);
    if (volume != null) {
        currentVolume = volume * VOLUME_SCALE;
    }
    const promises: Promise<Result<void>>[] = [];
    for (const type of Object.values(SoundType)) {
        const sound = Sound.fromType(type);
        soundsCache.set(type, [sound]);
        promises.push(sound.load());
    }
    const results = await Promise.all(promises);
    for (const result of results) {
        if (result.isErr()) {
            console.error(result.context('Failed to preload sound').err);
        }
    }
}

export function playSound(type: SoundType, volumeScale?: number): void {
    const cachedSounds = soundsCache.get(type);
    const availableSound = cachedSounds?.find((sound) => !sound.isPlaying);
    if (availableSound) {
        availableSound.play(volumeScale ?? 1);
        return;
    }
    const firstSound = cachedSounds?.[0];
    if (firstSound) {
        const clonedSound = firstSound.clone();
        cachedSounds.push(clonedSound);
        clonedSound.play(volumeScale ?? 1);
        return;
    }
    const sound = Sound.fromType(type);
    soundsCache.set(type, [sound]);
    sound.load().then((res) => {
        if (res.isOk()) {
            sound.play(volumeScale ?? 1);
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
    for (const [_, sounds] of soundsCache) {
        for (const sound of sounds) {
            sound.volume = currentVolume;
        }
    }
}

enum SoundState {
    NEW,
    LOADING,
    LOADED,
    PLAYING,
    ERROR,
}

class Sound {
    private state = SoundState.NEW;
    private audioBuffer: AudioBuffer | null = null;
    private gainNode: GainNode | null = null;
    #volume = 1;
    #volumeScale = 1;

    constructor(
        private src: string,
        private audioContext: AudioContext,
    ) {}

    static fromType(type: SoundType): Sound {
        const src = `./sounds/${type}.wav`;
        return new Sound(src, audioContext);
    }

    set volume(volume: number) {
        if (this.#volume !== volume) {
            this.#volume = volume;
            if (this.gainNode) {
                this.gainNode.gain.value = volume * this.#volumeScale;
            }
        }
    }

    get isPlaying(): boolean {
        return this.state === SoundState.PLAYING;
    }

    get loaded(): boolean {
        return this.state >= SoundState.LOADED;
    }

    // NOTE: scale is needed to play the same sound with different volumes at the same time
    play(volumeScale?: number): void {
        if (this.loaded) {
            const gainNode = this.getGainNode(volumeScale ?? 1);
            const audioSource = this.createSource(gainNode);
            audioSource.start(0);
            this.state = SoundState.PLAYING;
        } else {
            console.error(
                `Sound: cannot play, sound not loaded: "${this.src}"`,
            );
        }
    }

    clone(): Sound {
        const sound = new Sound(this.src, this.audioContext);
        sound.state = this.state;
        sound.#volume = this.#volume;
        sound.#volumeScale = this.#volumeScale;
        sound.audioBuffer = this.audioBuffer;
        sound.gainNode = this.gainNode;
        return sound;
    }

    // TODO: extract this out of Sound class.
    // Sound class should only be responsible for playing sounds with already valid data.
    // This way there is no need for state management in Sound class.
    async load(): Promise<Result<void>> {
        if (this.loaded) {
            console.warn(`Sound: already loaded: "${this.src}"`);
            return Result.Ok();
        }
        if (this.state === SoundState.LOADING) {
            console.warn(`Sound: already loading: "${this.src}"`);
            return Result.Ok();
        }
        this.state = SoundState.LOADING;
        const result = await Result.async(async () => {
            const buffer = await fetch(this.src)
                .then((res) => res.arrayBuffer())
                .catch((err) => {
                    throw wrapError(
                        err,
                        `Failed to fetch audio file "${this.src}"`,
                    );
                });
            this.audioBuffer = await this.audioContext
                .decodeAudioData(buffer)
                .catch((err) => {
                    throw wrapError(
                        err,
                        `Failed to decode audio data for "${this.src}"`,
                    );
                });
            this.state = SoundState.LOADED;
        });
        if (result.isErr()) {
            this.state = SoundState.ERROR;
        }
        return result.context(`Failed to load sound: "${this.src}"`);
    }

    private createSource(gainNode: GainNode): AudioBufferSourceNode {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        source.connect(gainNode);
        return source;
    }

    private getGainNode(volumeScale: number): GainNode {
        if (volumeScale < 0 || volumeScale > 1) {
            console.warn(
                `Sound: volume scale out of range: ${volumeScale}. Expected value between 0 and 1.`,
            );
        }
        volumeScale = clamp(volumeScale, 0, 1);
        if (this.#volumeScale !== volumeScale || !this.gainNode) {
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
        }
        this.#volumeScale = volumeScale;
        this.gainNode.gain.value = this.#volume * this.#volumeScale;
        return this.gainNode;
    }
}
