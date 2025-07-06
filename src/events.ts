import {Vector2Like} from '#/math/vector';
import {EntityId} from '#/entity/id';
import {Direction} from './entity/core';

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

export type GameEvent = ShotEvent | TankDestroyedEvent;

export class EventQueue {
    private events: GameEvent[] = [];

    push(event: GameEvent): void {
        this.events.push(event);
    }

    pop(): GameEvent | undefined {
        return this.events.shift();
    }
}

export const eventQueue = new EventQueue();
