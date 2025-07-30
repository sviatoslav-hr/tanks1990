import type {EventQueue} from '#/events';
import {type SoundConfig, SoundName} from '#/sound';

export type SoundEventType =
    | 'game-started'
    | 'game-over'
    | 'enemy-shooting'
    | 'enemy-damaged'
    | 'enemy-destroyed'
    | 'player-shooting'
    | 'player-damaged'
    | 'player-destroyed';

const allSoundConfigs: Record<SoundEventType, SoundConfig> = {
    ['game-started']: {name: SoundName.LEVEL_START, volume: 0.5},
    ['game-over']: {name: SoundName.GAME_OVER, volume: 1},
    // TODO: game-completed

    ['enemy-shooting']: {name: SoundName.SHOOTING, volume: 0.15},
    ['enemy-damaged']: {name: SoundName.HIT, volume: 0.3},
    ['enemy-destroyed']: {name: SoundName.EXPLOSION, volume: 0.6},

    ['player-shooting']: {name: SoundName.SHOOTING, volume: 0.6},
    ['player-damaged']: {name: SoundName.HIT, volume: 0.8},
    ['player-destroyed']: {name: SoundName.EXPLOSION, volume: 1},
};

export function soundEvent(events: EventQueue, soundType: SoundEventType): void {
    events.push({
        type: 'sound',
        config: allSoundConfigs[soundType],
    });
}
