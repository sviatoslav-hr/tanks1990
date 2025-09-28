import {Block} from '#/entity/block';
import {GameState} from '#/state';
import {createRoomsFromGraph, MAX_ROOMS_COUNT} from '#/world/generation';
import {generateWorldGraph, type WorldGraph} from '#/world/graph';
import {Room} from '#/world/room';

const FINAL_ROOMS_COUNT = 3;

export interface World {
    roomsLimit: number;
    activeRoom: Room;
    activeRoomInFocus: boolean;
    rooms: Room[];
    graph: WorldGraph | null;
}

export function newWorld(): World {
    return {
        roomsLimit: MAX_ROOMS_COUNT,
        activeRoom: Room.temp(),
        activeRoomInFocus: false,
        rooms: [],
        graph: null,
    };
}

export function initWorld(state: GameState): void {
    const world = state.world;
    world.graph = generateWorldGraph({
        depth: world.roomsLimit,
        finalNodesCount: FINAL_ROOMS_COUNT,
    });
    world.rooms = createRoomsFromGraph(world.graph, state);

    const startRoom = world.rooms[0];
    assert(startRoom);
    world.activeRoom = startRoom;
}

export function resetWorld(world: World): void {
    world.activeRoom = Room.temp();
    world.activeRoomInFocus = false;
    world.rooms = [];
}

export function* iterateAllBlocks(world: World): Generator<Block> {
    for (const room of world.rooms) {
        for (const block of room.blocks) {
            yield block;
        }
    }
}
