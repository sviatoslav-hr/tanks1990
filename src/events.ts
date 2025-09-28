export type GameControlAction = 'start' | 'pause' | 'resume' | 'game-over' | 'game-completed';

export type GameControlEvent = {
    type: 'game-control';
    action: GameControlAction;
    recordingSeed?: string;
    ignoreMenu?: boolean;
};

export type GameEvent = GameControlEvent;

export class EventQueue {
    private events: GameEvent[] = [];

    push(event: GameEvent): void {
        this.events.push(event);
    }

    pop(): GameEvent | undefined {
        return this.events.shift();
    }
}
