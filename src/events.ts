import type {EntityId} from '#/entity/id';
import type {Direction} from '#/math/direction';
import type {Vector2Like} from '#/math/vector';

export type GameControlEvent = {
    type: 'game-control';
    action: 'start' | 'resume' | 'init';
};

export type ShotEvent = {
    type: 'shot';
    bot: boolean;
    origin: Vector2Like;
    direction: Direction;
    entityId: EntityId;
    damage: number;
};

export type TankDamagedEvent = {
    type: 'tank-damaged';
    entityId: EntityId;
    bot: boolean;
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

export type GameEvent =
    | GameControlEvent
    | ShotEvent
    | TankDamagedEvent
    | TankDestroyedEvent
    | ProjectileExplodedEvent;

export class EventQueue {
    private events: GameEvent[] = [];

    push(event: GameEvent): void {
        this.events.push(event);
    }

    pop(): GameEvent | undefined {
        return this.events.shift();
    }
}
