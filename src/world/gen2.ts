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

export function generateWorldGraph(options: WorldGraphOptions): WorldGraph {
    const {
        depth: DEPTH,
        maxExitsPerRoom: _m,
        finalRoomsCount: _frc,
        mergeBias: _mb = 0.4,
        rng = Math.random,
    } = options;
    const roomOffset = 1;
    const rooms: Record<RoomId, Room> = {};
    const positionsMap: Map<string, RoomId> = new Map();

    let currentRoomId = 0;
    function roomId(): number {
        return currentRoomId++;
    }

    function makeRoom(r: Room): Room {
        rooms[r.id] = r;
        positionsMap.set(positionKey(r), r.id);
        return r;
    }
    function positionKey(p: Vector2Like): string {
        return `${p.x},${p.y}`;
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
    const root = makeRoom({
        id: roomId(),
        x: 0,
        y: 0,
        depth: 0,
        exits: {},
    });
    let leaf = root;
    const RETRY_LIMIT = 99;
    while (leaf.depth < DEPTH) {
        let triesCount = 0;
        while (triesCount < RETRY_LIMIT) {
            const direction = randomDirection();
            const position = directionOffset(direction);
            position.x += leaf.x;
            position.y += leaf.y;
            if (positionsMap.has(positionKey(position))) {
                triesCount++;
                continue; // Already exists, try again
            }

            const nextRoom = makeRoom({
                id: roomId(),
                x: position.x,
                y: position.y,
                depth: leaf.depth + 1,
                exits: {},
            });
            leaf.exits[direction] = nextRoom.id;
            leaf = nextRoom;
            break;
        }
    }

    return {rooms, startRoomId: root.id, depth: DEPTH};
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
