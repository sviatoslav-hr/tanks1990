import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {type Vector2Like} from '#/math/vector'; // {x,y}
import {type Renderer} from '#/renderer';

type Direction = 'north' | 'south' | 'east' | 'west';

type RoomId = number;

interface Room {
    id: RoomId;
    x: number;
    y: number;
    depth: number;
    // Exits are undirected "holes" in the walls to adjacent rooms.
    exits: Partial<Record<Direction, RoomId>>; // maps direction -> neighbor room id
}

interface WorldGraph {
    rooms: Record<RoomId, Room>;
    startRoomId: RoomId;
    depth: number;
}

interface WorldGraphOptions {
    depth: number; // >= 1
    maxExitsPerRoom: number; // 1..3
    /** Hard cap: number of unique leaf rooms (depth === maxDepth). Must be >= 1. */
    finalRoomsCount: number;
    mergeBias?: number; // 0..1, higher means prefer merging into existing next-layer rooms (default 0.4)
    rng?: () => number; // optional custom RNG for determinism
}

function positionKey(p: Vector2Like): string {
    return `${p.x},${p.y}`;
}

export function generateWorldGraph(options: WorldGraphOptions): WorldGraph {
    const {
        depth: DEPTH,
        maxExitsPerRoom: _m,
        finalRoomsCount: _frc,
        mergeBias: _mb = 0.4,
        rng = Math.random,
    } = options;
    assert(DEPTH >= 3);
    const roomOffset = 1;
    let finalRoomDistance = Math.max(3, Math.floor(DEPTH / 3));
    if (DEPTH % 2 === 0 && finalRoomDistance % 2 === 1) {
        finalRoomDistance++;
    } else if (DEPTH % 2 === 1 && finalRoomDistance % 2 === 0) {
        finalRoomDistance++;
    }
    const rooms: Record<RoomId, Room> = {};
    const positionsMap: Map<string, RoomId> = new Map();

    logger.debug('Generating world: %O', {DEPTH, finalRoomDistance});

    let currentRoomId = 0;
    function roomId(): number {
        return currentRoomId++;
    }

    function makeRoom(r: Room): Room {
        rooms[r.id] = r;
        positionsMap.set(positionKey(r), r.id);
        return r;
    }
    function directionOffset(d: Direction): Vector2Like {
        switch (d) {
            case 'north':
                return {x: 0, y: -roomOffset};
            case 'south':
                return {x: 0, y: roomOffset};
            case 'east':
                return {x: roomOffset, y: 0};
            case 'west':
                return {x: -roomOffset, y: 0};
        }
    }
    const directions: Direction[] = ['north', 'south', 'east', 'west'];
    function randomDirection(): Direction {
        return directions[Math.floor(rng() * directions.length)]!;
    }
    const rootRoom = makeRoom({
        id: roomId(),
        x: 0,
        y: 0,
        depth: 0,
        exits: {},
    });
    let leafRoom = rootRoom;
    const finalRoom = makeRoom({
        id: roomId(),
        x: rootRoom.x + finalRoomDistance,
        y: 0,
        depth: DEPTH,
        exits: {},
    });

    function areNeighbors(r1: Room, r2: Room): boolean {
        const dx = Math.abs(r1.x - r2.x);
        const dy = Math.abs(r1.y - r2.y);
        return (dx === roomOffset && dy === 0) || (dx === 0 && dy === roomOffset);
    }

    function getRoomDirection(source: Room, target: Room): Direction | null {
        if (source.x === target.x) {
            if (source.y < target.y) return 'south';
            if (source.y > target.y) return 'north';
        } else if (source.y === target.y) {
            if (source.x < target.x) return 'east';
            if (source.x > target.x) return 'west';
        }
        return null; // Not a neighbor
    }

    function clearRooms(start: Room): void {
        let roomParent = start;
        inner: while (true) {
            // FIXME: This doesn't handle well with multiple exits.
            const roomId = Object.values(roomParent.exits).pop();
            if (!roomId) break inner;
            const room = rooms[roomId];
            assert(room);
            positionsMap.delete(positionKey(room));
            delete rooms[roomId];
            roomParent.exits = {};
            roomParent = room;
        }
        leafRoom = rootRoom;
    }

    // debugger;

    // TODO: Find all possible room paths
    // TODO: Pick random leafs (finalRoomsCount)
    // TODO: Eliminate invalid paths, except for the paths that lead to final rooms.
    // TODO: Merge paths, remove them, etc
    // TODO: Add support to specify how far final rooms can be from the root.
    const DIRECTION_RETRY_LIMIT = 99;
    const FULL_RETRY_LIMIT = 9999;
    const INFINITE_LOOP_LIMIT = 100_000;
    let actualLoopCount = 0;
    let fullTriesCount = 0;
    outer: while (true) {
        actualLoopCount++;
        if (actualLoopCount > INFINITE_LOOP_LIMIT) {
            logger.warn('infinite loop detected, breaking');
            break;
        }

        if (fullTriesCount > FULL_RETRY_LIMIT) {
            logger.warn('exceeded full tries limit, breaking');
            break;
        }

        if (leafRoom.depth + 1 === DEPTH) {
            if (areNeighbors(leafRoom, finalRoom)) {
                const direction = getRoomDirection(leafRoom, finalRoom);
                assert(direction);
                leafRoom.exits[direction] = finalRoom.id;
                logger.debug(
                    'found final room %d at %d,%d',
                    finalRoom.id,
                    finalRoom.x,
                    finalRoom.y,
                );
                break outer;
            } else {
                fullTriesCount++;
                if (fullTriesCount < FULL_RETRY_LIMIT) clearRooms(rootRoom);
                continue outer;
            }
        }

        // TODO: This condition now is kind of useless...
        // while (leafRoom.depth < DEPTH) {
        let triesCount = 0;
        let found = false;
        inner: while (triesCount < DIRECTION_RETRY_LIMIT) {
            const direction = randomDirection();
            const position = directionOffset(direction);
            position.x += leafRoom.x;
            position.y += leafRoom.y;
            if (positionsMap.has(positionKey(position))) {
                triesCount++;
                continue inner; // Already exists, try again
            }

            const nextRoom = makeRoom({
                id: roomId(),
                x: position.x,
                y: position.y,
                depth: leafRoom.depth + 1,
                exits: {},
            });
            leafRoom.exits[direction] = nextRoom.id;
            leafRoom = nextRoom;
            found = true;
            break inner;
        }

        if (!found) {
            fullTriesCount++;
            if (fullTriesCount < FULL_RETRY_LIMIT) clearRooms(rootRoom);
            continue outer; // No more directions to try, break the outer loop
        }

        // }
    }

    logger.debug('took %d tries', fullTriesCount);

    return {rooms, startRoomId: rootRoom.id, depth: DEPTH};
}

export function drawWorldGraph(renderer: Renderer, graph: WorldGraph): void {
    drawWorldRooms(renderer, graph);
    const scale = CELL_SIZE;
    const w = 1 * scale;
    const h = 1 * scale;
    const rooms = Object.values(graph.rooms);

    const limit = 99;

    const rootRoom = graph.rooms[graph.startRoomId];
    assert(rootRoom);
    renderer.setStrokeColor(Color.WHITE);
    drawRoomPath(renderer, rootRoom, graph);
}

function drawRoomPath(renderer: Renderer, room: Room, world: WorldGraph): void {
    const nextRooms = Object.values(room.exits).map((id) => {
        const nextRoom = world.rooms[id];
        assert(nextRoom);
        return nextRoom;
    });
    for (const n of nextRooms) {
        const x1 = room.x * CELL_SIZE + CELL_SIZE / 2;
        const y1 = room.y * CELL_SIZE + CELL_SIZE / 2;
        const x2 = n.x * CELL_SIZE + CELL_SIZE / 2;
        const y2 = n.y * CELL_SIZE + CELL_SIZE / 2;
        renderer.strokeLine(x1, y1, x2, y2, 1);
        drawRoomPath(renderer, n, world);
    }
}

function drawWorldRooms(renderer: Renderer, graph: WorldGraph): void {
    renderer.setGlobalAlpha(0.3);
    const scale = CELL_SIZE;
    const w = 1 * scale;
    const h = 1 * scale;
    const rooms = Object.values(graph.rooms);

    const limit = 99;

    // renderer.useCameraCoords(true);
    renderer.setFillColor(Color.GREEN);
    for (const room of rooms) {
        if (room.depth > limit) continue; // Skip deep rooms for clarity
        let {x, y} = room;
        x *= scale;
        y *= scale;
        renderer.fillRect(x, y, w, h);
    }
    renderer.setFillColor(Color.BLACK + 'bf');
    for (const room of rooms) {
        if (room.depth > limit) continue; // Skip deep rooms for clarity
        for (const dir of Object.keys(room.exits)) {
            let {x: dx, y: dy} = room;
            dx *= scale;
            dy *= scale;
            let dw = w / 2;
            let dh = h / 2;
            switch (dir) {
                case 'north': {
                    dh = h / 2;
                    dw = w / 8;
                    dx += w / 2 - dw / 2;
                    dy -= dh / 2;
                    break;
                }
                case 'south': {
                    dh = h / 2;
                    dw = w / 8;
                    dx += w / 2 - dw / 2;
                    dy -= dh / 2;
                    dy += h;
                    break;
                }
                case 'west': {
                    dw = w / 2;
                    dh = h / 8;
                    dx -= dw / 2;
                    dy += h / 2 - dh / 2;
                    break;
                }
                case 'east': {
                    dw = w / 2;
                    dh = h / 8;
                    dx += w;
                    dx -= dw / 2;
                    dy += h / 2 - dh / 2;
                    break;
                }
            }
            renderer.fillRect(dx, dy, dw, dh);
        }
    }
    renderer.setFillColor(Color.BLACK);
    renderer.setFont('24px sans-serif');
    for (const room of rooms) {
        let {x, y} = room;
        x *= scale;
        y *= scale;
        x += w / 2;
        y += h / 2;
        // x /= renderer.camera.scale;
        // y /= renderer.camera.scale;
        const text = room.depth.toString();
        renderer.fillText(text, {x, y, color: Color.BLACK});
    }
    renderer.setGlobalAlpha(1);
}
