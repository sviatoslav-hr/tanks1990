import {Boom, ParticleExplosion} from '#/effect';
import {PlayerTank, Tank} from '#/entity';
import {Entity, isIntesecting, isSameEntity} from '#/entity/core';
import {EntityId} from '#/entity/id';
import {Projectile} from '#/entity/projectile';
import {EventQueue} from '#/events';
import {isPosInsideRect, Rect} from '#/math';
import {Vector2Like} from '#/math/vector';
import {
    activateRecording,
    stopRecording,
    type RecordingData,
    type RecordingStatus,
} from '#/recording';
import {Camera} from '#/renderer/camera';
import {SoundManager, type Sound} from '#/sound';
import {isRoomCompleted, type Room} from '#/world/room';
import {newWorld} from '#/world/world';
import {GameStorage} from './storage';

export enum GameStatus {
    INITIAL,
    PLAYING,
    PAUSED,
    DEAD,
}

// TODO: I'm not sure what this class is really for.
//       It seems to try to be a minimal state holder, but at the same time it's also responsive for recording.
//       It should be decided if this class should be minimal or if it should handle everything that happens during state changes.
export class GameState {
    status = GameStatus.INITIAL;
    gameCompleted = false;
    debugUpdateTriggered = false;
    debugShowBoundaries = false;

    readonly world = newWorld();
    readonly player = new PlayerTank();
    tanks: Tank[] = [];
    projectiles: Projectile[] = [];
    effects: ParticleExplosion[] = [];
    booms: Boom[] = [];
    cachedBotExplosion: ParticleExplosion | null = null;
    cachedPlayerExplosion: ParticleExplosion | null = null;

    events = new EventQueue();
    battleMusic: Sound | null = null;
    storage: GameStorage;
    sounds: SoundManager;
    playerCamera = new Camera();
    devCamera = new Camera();

    constructor(storage: GameStorage) {
        this.storage = storage;
        this.sounds = new SoundManager(storage);
    }

    recording: RecordingStatus = {
        enabled: true,
        active: false,
        playing: false,
        playingInputIndex: 0,
        playingSpeedMult: 1,
        currentInput: null,
    };
    recordingData: RecordingData = {
        commitHash: COMMIT_HASH,
        version: GAME_VERSION,
        seed: 'default',
        inputs: [],
        startedAt: 0,
    };

    get initial(): boolean {
        return this.status === GameStatus.INITIAL;
    }

    get playing(): boolean {
        return this.status === GameStatus.PLAYING;
    }

    get paused(): boolean {
        return this.status === GameStatus.PAUSED;
    }

    get dead(): boolean {
        return this.status === GameStatus.DEAD;
    }

    init(): void {
        this.status = GameStatus.INITIAL;
    }

    pause(): void {
        this.status = GameStatus.PAUSED;
    }

    resume(): void {
        this.status = GameStatus.PLAYING;
    }

    start(): void {
        // NOTE: playing is set before the game starts, so it should be checked here.
        if (!this.recording.playing && this.recording.enabled) {
            activateRecording(this.recording, this.recordingData);
        }
        this.status = GameStatus.PLAYING;
    }

    markDead(): void {
        if (this.recording.active) {
            stopRecording(this.recording, true);
        }
        if (this.recording.playing) {
            this.recording.playing = false;
        }
        this.status = GameStatus.DEAD;
    }

    markCompleted(): void {
        if (this.recording.active) {
            stopRecording(this.recording, true);
        }
        if (this.recording.playing) {
            this.recording.playing = false;
        }
        this.gameCompleted = true;
    }

    nextTick() {
        this.debugUpdateTriggered = false;
    }

    togglePauseResume(): void {
        switch (this.status) {
            case GameStatus.DEAD: {
                logger.warn('Cannot toggle pause/resume while in dead state');
                break;
            }
            case GameStatus.PLAYING: {
                if (!this.dead) {
                    this.pause();
                }
                break;
            }
            case GameStatus.PAUSED: {
                assert(!this.dead, 'Cannot die while paused');
                this.resume();
                break;
            }
            case GameStatus.INITIAL:
                break;
            default:
                logger.warn('Unhandled Game status %s', this.status);
        }
    }

    *iterateCollidable(): Generator<Entity> {
        for (const t of this.tanks) {
            if (!t.dead) yield t;
        }
        for (const b of this.world.activeRoom.blocks) {
            if (!b.dead) yield b;
        }
    }

    *iterateEntities(): Generator<Entity> {
        for (const t of this.tanks) {
            if (!t.dead) {
                yield t;
            }
        }
        for (const p of this.projectiles) {
            if (!p.dead) {
                yield p;
            }
        }
        for (const b of this.world.activeRoom.blocks) {
            if (!b.dead) {
                yield b;
            }
        }
    }

    findTank(id: EntityId): Tank | undefined {
        return this.tanks.find((t) => t.id === id);
    }

    findCollided(target: Entity): Entity | undefined {
        for (const entity of this.iterateCollidable()) {
            if (entity.equals(target)) continue;
            if (isIntesecting(target, entity)) {
                return entity;
            }
        }
        return;
    }
}

export function checkGameCompletion(state: GameState): void {
    const player = state.player;

    if (state.playing && player.dead && player.healthAnimation.finished) {
        state.events.push({type: 'game-control', action: 'game-over'});
    }

    if (!player.dead && justCompletedGame(state, state.world.activeRoom)) {
        state.events.push({type: 'game-control', action: 'game-completed'});
    }
}

function justCompletedGame(state: GameState, room: Room): boolean {
    return state.playing && !state.gameCompleted && isRoomCompleted(room) && !room.nextRooms.length;
}

export function isOccupied(pos: Vector2Like, state: GameState, ignoredEntity?: Entity): boolean {
    for (const entity of state.iterateCollidable()) {
        if (entity === state.player) continue;
        if (ignoredEntity && isSameEntity(entity, ignoredEntity)) continue;
        if (isPosInsideRect(pos.x, pos.y, entity)) {
            return true;
        }
    }
    return false;
}

export function isRectOccupied(rect: Rect, state: GameState, ignoreEntity?: Entity): boolean {
    for (const entity of state.iterateCollidable()) {
        if (isSameEntity(entity, state.player)) continue;
        if (ignoreEntity && isSameEntity(entity, ignoreEntity)) continue;
        if (isIntesecting(rect, entity)) {
            return true;
        }
    }
    return false;
}
