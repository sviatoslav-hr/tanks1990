import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {Block} from '#/entity/block';
import {Vector2} from '#/math/vector';
import {GameState} from '#/state';
import {createRoomsFromGraph, MAX_ROOMS_COUNT} from '#/world/generation';
import {generateWorldGraph, type WorldGraph} from '#/world/graph';
import {Room} from '#/world/room';

const FINAL_ROOMS_COUNT = 3;

export class World {
    roomsLimit = MAX_ROOMS_COUNT;
    activeRoom = Room.temp();
    activeRoomInFocus = false;
    rooms: Room[] = [];
    graph: WorldGraph | null = null;

    readonly startRoomPosition = new Vector2(0, 0);
    readonly bgColor = Color.BLACK_IERIE;
    readonly gridColor = Color.BLACK_ONYX;
    readonly boundaryThickness = 0.1 * CELL_SIZE;

    init(state: GameState): void {
        this.graph = generateWorldGraph({
            depth: this.roomsLimit,
            finalNodesCount: FINAL_ROOMS_COUNT,
        });
        this.rooms = createRoomsFromGraph(this.graph, state);

        const startRoom = this.rooms[0];
        assert(startRoom);
        this.activeRoom = startRoom;
    }

    update(state: GameState): void {
        this.activeRoom?.update(state);
    }

    *iterateBlocks(): Generator<Block> {
        for (const room of this.rooms) {
            for (const block of room.blocks) {
                yield block;
            }
        }
    }

    reset(): void {
        this.activeRoom = Room.temp();
        this.activeRoomInFocus = false;
        this.rooms = [];
    }
}
