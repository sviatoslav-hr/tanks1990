import {Result} from '#/common';
import {GameStorage} from '#/storage';

export enum SoundType {
    EXPLOSION = 'explosion_8bit',
    SHOOTING = 'cannon_fire',
    HIT = 'hit',
    GAME_OVER = 'game_over',
    LEVEL_START = 'level_start',
    BATTLE_THEME = 'too_strong',
}

const GAME_VOLUME_KEY = 'game_volume';
const VOLUME_SCALE = 0.3;

export class SoundManager {
    #volume = 1 * VOLUME_SCALE;
    #mutePromise: Promise<void> | null = null;
    // TODO: This should be created only after user made any action on the page.
    private readonly soundsCache = new Map<SoundType, Sound[]>();

    constructor(
        private readonly storage: GameStorage,
        private readonly audioContext = new AudioContext(),
    ) {}

    get volume(): number {
        return Math.min(this.#volume / VOLUME_SCALE, 1);
    }

    updateVolume(volume: number) {
        this.#volume = volume * VOLUME_SCALE;
        this.storage.set(GAME_VOLUME_KEY, volume.toString());

        for (const [_, sounds] of this.soundsCache) {
            for (const sound of sounds) {
                sound.volume = this.#volume;
            }
        }
    }

    suspend(): void {
        if (this.audioContext.state === 'suspended') return;
        if (this.#mutePromise) return;

        this.#mutePromise = this.audioContext.suspend().then(() => {
            this.#mutePromise = null;
        });
    }

    resume(): void {
        if (this.audioContext.state === 'running') return;
        if (this.#mutePromise) return;

        this.#mutePromise = this.audioContext.resume().then(() => {
            this.#mutePromise = null;
        });
    }

    async loadAllSounds(): Promise<void> {
        let volume = this.storage.getNumber(GAME_VOLUME_KEY);
        if (volume != null) {
            volume = Math.max(Math.min(1, volume), 0);
            this.#volume = volume * VOLUME_SCALE;
        }
        const promises: Promise<Result<void>>[] = [];
        for (const type of Object.values(SoundType)) {
            const sound = Sound.fromType(type, this.audioContext);
            sound.volume = this.#volume;
            this.soundsCache.set(type, [sound]);
            promises.push(sound.load());
        }
        const results = await Promise.all(promises);
        for (const result of results) {
            if (result.isErr()) {
                logger.error(result.contextErr('Failed to batch load sound').err);
            }
        }
    }

    playSound(type: SoundType, volumeScale?: number, loop = false): Sound {
        const shouldPlay = this.audioContext.state === 'running' || loop;
        const cachedSounds = this.soundsCache.get(type);
        const availableSound = cachedSounds?.find((sound) => !sound.isPlaying);
        if (availableSound) {
            if (shouldPlay) availableSound.play(volumeScale ?? 1, loop);
            return availableSound;
        }

        // NOTE: All sounds of this type are currently playing, so we need to clone one of them.
        const firstSound = cachedSounds?.[0];
        if (firstSound) {
            const clonedSound = firstSound.clone();
            cachedSounds.push(clonedSound);
            if (shouldPlay) clonedSound.play(volumeScale ?? 1, loop);
            return clonedSound;
        }

        // NOTE: Can only happen if failed to preload the sound.
        const sound = Sound.fromType(type, this.audioContext);
        this.soundsCache.set(type, [sound]);
        sound.load().then((res) => {
            if (res.isOk()) {
                if (shouldPlay) sound.play(volumeScale ?? 1, loop);
            } else {
                logger.error(res.contextErr(`Failed to play sound: ${type}`).err);
            }
        });
        return sound;
    }
}

enum SoundState {
    INIT,
    LOADING,
    LOADED,
    PLAYING,
    ERROR,
}

export class Sound {
    private state = SoundState.INIT;
    private audioBuffer: AudioBuffer | null = null;
    private gainNode: GainNode | null = null;
    private source: AudioBufferSourceNode | null = null;
    #volume = 1;
    #volumeScale = 1;
    #startTime = 0;
    #pauseTime = 0;
    #loop = false;

    private constructor(
        private src: string,
        private audioContext: AudioContext,
    ) {}

    static fromType(type: SoundType, audioContext: AudioContext): Sound {
        const src = type.includes('.') ? `sounds/${type}` : `./sounds/${type}.wav`;
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

    get paused(): boolean {
        return this.state === SoundState.LOADED && this.#pauseTime > 0;
    }

    play(volumeScale?: number, loop = false): void {
        assert(this.loaded, `Sound: cannot play, sound not loaded: "${this.src}"`);
        this.startAudioSource(volumeScale ?? 1, 0, loop);
        this.#startTime = this.audioContext.currentTime;
        this.#pauseTime = 0;
    }

    resume(): void {
        this.startAudioSource(this.#volumeScale, this.#pauseTime, this.#loop);
    }

    private startAudioSource(volumeScale: number, startTime: number, loop: boolean): void {
        const gainNode = this.getGainNode(volumeScale);
        const audioSource = this.getAudioSourceNode(gainNode);
        audioSource.loop = this.#loop = loop;
        audioSource.start(0, startTime);
        this.state = SoundState.PLAYING;
    }

    pause(): void {
        this.source?.stop();
        this.source = null; // NOTE: We can't pause the source, so we need to delete it.
        this.state = SoundState.LOADED;
        this.#pauseTime = this.audioContext.currentTime - this.#startTime;
    }

    stop(): void {
        this.source?.stop();
        this.source = null;
        this.state = SoundState.LOADED;
        this.#pauseTime = 0;
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
    async load(): Promise<Result<void, Error>> {
        if (this.loaded) {
            logger.warn(`Sound: already loaded: "${this.src}"`);
            return Result.ok();
        }
        if (this.state === SoundState.LOADING) {
            logger.warn(`Sound: already loading: "${this.src}"`);
            return Result.ok();
        }

        this.state = SoundState.LOADING;
        const bufferResult = await Result.async(fetch(this.src))
            .contextErr(`Failed to fetch audio file "${this.src}"`)
            .mapPromise((res) => res.arrayBuffer())
            .contextErr(`Failed to read audio file "${this.src}" response as array buffer`)
            .mapPromise((buffer) => this.audioContext.decodeAudioData(buffer))
            .contextErr(`Failed to decode audio data for "${this.src}"`);

        if (bufferResult.isErr()) {
            this.state = SoundState.ERROR;
            return bufferResult.castValue();
        }

        this.audioBuffer = bufferResult.value;
        this.state = SoundState.LOADED;
        return Result.ok();
    }

    private getAudioSourceNode(gainNode: GainNode): AudioBufferSourceNode {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        source.connect(gainNode);
        this.source = source;
        return source;
    }

    private getGainNode(volumeScale: number): GainNode {
        if (volumeScale < 0) {
            logger.warn(
                `Sound: volume scale out of range: ${volumeScale}. Expected value bigger than 0.`,
            );
        }
        volumeScale = Math.max(0, volumeScale);
        if (this.#volumeScale !== volumeScale || !this.gainNode) {
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
        }
        this.#volumeScale = volumeScale;
        this.gainNode.gain.value = this.#volume * this.#volumeScale;
        return this.gainNode;
    }
}
