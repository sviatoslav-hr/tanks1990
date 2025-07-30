import type {EntityId} from '#/entity/id';
import type {Direction} from '#/math/direction';
import type {Vector2Like} from '#/math/vector';
import {SoundConfig} from '#/sound';

export type GameControlEvent = {
    type: 'game-control';
    action: 'init' | 'start' | 'pause' | 'resume' | 'game-over' | 'game-completed';
    ignoreMenu?: boolean;
};

export type ShotEvent = {
    type: 'shot';
    bot: boolean;
    origin: Vector2Like;
    direction: Direction;
    entityId: EntityId;
    damage: number;
};

export type TankDestroyedEvent = {
    type: 'tank-destroyed';
    entityId: EntityId;
    bot: boolean;
};

export type ProjectileExplodedEvent = {
    type: 'projectile-exploded';
    entityId: EntityId;
};

export type SoundEvent = {
    type: 'sound';
    config: SoundConfig;
};

export type GameEvent =
    | GameControlEvent
    | ShotEvent
    | TankDestroyedEvent
    | ProjectileExplodedEvent
    | SoundEvent;

export class EventQueue {
    private events: GameEvent[] = [];

    push(event: GameEvent): void {
        this.events.push(event);
    }

    pop(): GameEvent | undefined {
        return this.events.shift();
    }
}
