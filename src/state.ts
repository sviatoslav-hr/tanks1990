import {Boom, ParticleExplosion} from '#/effect';
import {PlayerTank, Tank} from '#/entity';
import {Projectile} from '#/entity/projectile';
import {EventQueue} from '#/events';
import {
    activateRecording,
    stopRecording,
    type RecordingData,
    type RecordingStatus,
} from '#/recording';
import {Camera} from '#/renderer/camera';
import {initEntities, setupMainBackgroundScene} from '#/simulation';
import {SoundManager, type Sound} from '#/sound';
import {GameStorage} from '#/storage';
import {isRoomCompleted, type Room} from '#/world/room';
import {newWorld, World} from '#/world/world';
import {MAX_ROOMS_COUNT} from './world/generation';

export enum GameStatus {
    INITIAL,
    PLAYING,
    PAUSED,
    DEAD,
}

// TODO: I'm not sure what this class is really for.
//       It seems to try to be a minimal state holder, but at the same time it's also responsive for recording.
//       It should be decided if this class should be minimal or if it should handle everything that happens during state changes.
export interface GameState {
    status: GameStatus;
    gameCompleted: boolean;
    debugUpdateTickTriggered: boolean;
    debugShowBoundaries: boolean;

    readonly world: World;
    readonly player: PlayerTank;
    tanks: Tank[];
    projectiles: Projectile[];
    effects: ParticleExplosion[];
    booms: Boom[];
    cachedBotExplosion: ParticleExplosion | null;
    cachedPlayerExplosion: ParticleExplosion | null;

    events: EventQueue;
    battleMusic: Sound | null;
    storage: GameStorage;
    sounds: SoundManager;
    playerCamera: Camera;
    devCamera: Camera;

    recording: RecordingStatus;
    recordingData: RecordingData;
}

export function newGameState(storage: GameStorage): GameState {
    return {
        status: GameStatus.INITIAL,
        gameCompleted: false,
        debugUpdateTickTriggered: false,
        debugShowBoundaries: false,

        world: newWorld(),
        player: new PlayerTank(),
        tanks: [],
        projectiles: [],
        effects: [],
        booms: [],
        cachedBotExplosion: null,
        cachedPlayerExplosion: null,

        events: new EventQueue(),
        battleMusic: null,
        storage: storage,
        sounds: new SoundManager(storage),
        playerCamera: new Camera(),
        devCamera: new Camera(),

        recording: {
            enabled: true,
            active: false,
            playing: false,
            playingInputIndex: 0,
            playingSpeedMult: 1,
            currentInput: null,
        },
        recordingData: {
            commitHash: COMMIT_HASH,
            version: GAME_VERSION,
            seed: 'default',
            inputs: [],
            startedAt: 0,
        },
    };
}

export function checkGameCompletion(state: GameState): void {
    const player = state.player;

    if (isPlaying(state) && player.dead && player.healthAnimation.finished) {
        state.events.push({type: 'game-control', action: 'game-over'});
    }

    if (!player.dead && justCompletedGame(state, state.world.activeRoom)) {
        state.events.push({type: 'game-control', action: 'game-completed'});
    }
}

function justCompletedGame(state: GameState, room: Room): boolean {
    return (
        isPlaying(state) && !state.gameCompleted && isRoomCompleted(room) && !room.nextRooms.length
    );
}

export function initGame(state: GameState): void {
    state.status = GameStatus.INITIAL;
    setupMainBackgroundScene(state);
}

export function startGame(state: GameState): void {
    // NOTE: playing is set before the game starts, so it should be checked here.
    if (!state.recording.playing && state.recording.enabled) {
        activateRecording(state.recording, state.recordingData);
    }
    state.status = GameStatus.PLAYING;
    state.world.roomsLimit = MAX_ROOMS_COUNT;
    initEntities(state);
}

export function pauseGame(state: GameState): void {
    state.status = GameStatus.PAUSED;
}
export function resumeGame(state: GameState): void {
    state.status = GameStatus.PLAYING;
}

export function completeGame(state: GameState): void {
    state.player.completedGame = true;
    if (state.recording.active) {
        stopRecording(state.recording, true);
    }
    if (state.recording.playing) {
        state.recording.playing = false;
    }
    state.gameCompleted = true;
}

export function markGameDead(state: GameState): void {
    if (state.recording.active) {
        stopRecording(state.recording, true);
    }
    if (state.recording.playing) {
        state.recording.playing = false;
    }
    state.status = GameStatus.DEAD;
}

export function isPlaying(state: GameState): boolean {
    return state.status === GameStatus.PLAYING;
}

export function isPaused(state: GameState): boolean {
    return state.status === GameStatus.PAUSED;
}

export function isDead(state: GameState): boolean {
    return state.status === GameStatus.DEAD;
}

export function resetGameAfterTick(state: GameState): void {
    state.debugUpdateTickTriggered = false;
}
