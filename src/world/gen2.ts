import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {v2AddMut, v2Equals, type Vector2Like} from '#/math/vector'; // {x,y}
import {type Renderer} from '#/renderer';

type Direction = 'north' | 'south' | 'east' | 'west';

const ALL_DIRECTIONS: Direction[] = ['north', 'south', 'east', 'west'];

type RoomId = number;

interface Room {
    id: RoomId;
    x: number;
    y: number;
    depth: number;
    // Exits are undirected "holes" in the walls to adjacent rooms.
    exits: Partial<Record<Direction, RoomId>>; // maps direction -> neighbor room id
}

interface RoomNode {
    position: Vector2Like;
    depth: number;
    prevRoom: RoomNode | null;
    nextRooms: Partial<Record<Direction, RoomNode>>;
}

export interface WorldGraph {
    rooms: Record<RoomId, Room>;
    startRoomId: RoomId;
    depth: number;
    totalPaths: number;
    currentPathIndex: number;
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

const ROOM_OFFSET = 1;
function directionOffset(d: Direction): Vector2Like {
    switch (d) {
        case 'north':
            return {x: 0, y: -ROOM_OFFSET};
        case 'south':
            return {x: 0, y: ROOM_OFFSET};
        case 'east':
            return {x: ROOM_OFFSET, y: 0};
        case 'west':
            return {x: -ROOM_OFFSET, y: 0};
    }
}

let currentRoomId = 0;
function roomId(): number {
    return currentRoomId++;
}

function areNeighborPositions(r1: Vector2Like, r2: Vector2Like): boolean {
    const dx = Math.abs(r1.x - r2.x);
    const dy = Math.abs(r1.y - r2.y);
    return (dx === ROOM_OFFSET && dy === 0) || (dx === 0 && dy === ROOM_OFFSET);
}

function prevRoomExistsAt(end: RoomNode, pos: Vector2Like): boolean {
    if (!end.prevRoom) return false;
    if (v2Equals(end.prevRoom.position, pos)) return true;
    return prevRoomExistsAt(end.prevRoom, pos);
}

function getDirection(source: Vector2Like, target: Vector2Like): Direction | null {
    if (source.x === target.x) {
        if (source.y < target.y) return 'south';
        if (source.y > target.y) return 'north';
    } else if (source.y === target.y) {
        if (source.x < target.x) return 'east';
        if (source.x > target.x) return 'west';
    }
    return null; // Not aligned horizontally or vertically
}

function findRoomPaths(leaf: RoomNode, final: Room, desiredDepth: number): boolean {
    let hasValidLeaf = false;
    for (const dir of ALL_DIRECTIONS) {
        const position = directionOffset(dir);
        v2AddMut(position, leaf.position);
        if ((leaf.prevRoom && prevRoomExistsAt(leaf, position)) || v2Equals(position, final)) {
            // Do not allow room to collide with any previous room in the path
            continue;
        }
        let isValidRoom = false;
        const room: RoomNode = {position, depth: leaf.depth + 1, prevRoom: leaf, nextRooms: {}};
        if (room.depth === desiredDepth - 1) {
            if (areNeighborPositions(final, position)) {
                const finalDirection = getDirection(room.position, final);
                assert(finalDirection != null);
                room.nextRooms[finalDirection] = {
                    position: {x: final.x, y: final.y},
                    depth: desiredDepth,
                    prevRoom: room,
                    nextRooms: {},
                };
                isValidRoom = true;
            }
        } else {
            const found = findRoomPaths(room, final, desiredDepth);
            if (found) isValidRoom = true;
        }
        if (isValidRoom) {
            leaf.nextRooms[dir] = room;
            hasValidLeaf = true;
        }
    }
    return hasValidLeaf;
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
    let finalRoomDistance = Math.max(3, Math.floor(DEPTH / 3));
    if (DEPTH % 2 === 0 && finalRoomDistance % 2 === 1) {
        finalRoomDistance++;
    } else if (DEPTH % 2 === 1 && finalRoomDistance % 2 === 0) {
        finalRoomDistance++;
    }
    const rooms: Record<RoomId, Room> = {};
    const positionsMap: Map<string, RoomId> = new Map();

    logger.debug('Generating world: %O', {DEPTH, finalRoomDistance});

    function makeRoom(r: Room): Room {
        rooms[r.id] = r;
        positionsMap.set(positionKey(r), r.id);
        return r;
    }
    const rootRoom = makeRoom({id: roomId(), x: 0, y: 0, depth: 0, exits: {}});
    let leafRoom = rootRoom;
    const finalRoom = makeRoom({
        id: roomId(),
        x: rootRoom.x + finalRoomDistance,
        y: 0,
        depth: DEPTH,
        exits: {},
    });

    // TODO: Find all possible room paths
    // TODO: Pick random leafs (finalRoomsCount)
    // TODO: Eliminate invalid paths, except for the paths that lead to final rooms.
    // TODO: Merge paths, remove them, etc
    // TODO: Add support to specify how far final rooms can be from the root.

    const startNode: RoomNode = {
        position: {x: rootRoom.x, y: rootRoom.y},
        depth: 0,
        prevRoom: null,
        nextRooms: {},
    };
    const graphValid = findRoomPaths(startNode, finalRoom, DEPTH);
    if (!graphValid) {
        throw new Error('Failed to generate world graph: no valid paths found');
    }

    let totalPaths = 0;

    function traverseAndBuild(roomNode: RoomNode, room: Room, final: Room, depth: number): void {
        const nextRoomsEntries = Object.entries(roomNode.nextRooms) as [Direction, RoomNode][];
        for (const [dir, nextRoomNode] of nextRoomsEntries) {
            const p = nextRoomNode.position;
            if (v2Equals(p, final)) {
                room.exits[dir] = final.id;
                totalPaths++;
                continue;
            }
            const nextRoom = makeRoom({
                id: roomId(),
                x: nextRoomNode.position.x,
                y: nextRoomNode.position.y,
                depth: nextRoomNode.depth,
                exits: {},
            });
            traverseAndBuild(nextRoomNode, nextRoom, final, depth);
            room.exits[dir] = nextRoom.id;
        }
    }

    traverseAndBuild(startNode, rootRoom, finalRoom, DEPTH);

    return {rooms, startRoomId: rootRoom.id, depth: DEPTH, totalPaths, currentPathIndex: 0};
}

export function drawWorldGraph(renderer: Renderer, graph: WorldGraph): void {
    // drawWorldRooms(renderer, graph);
    const scale = CELL_SIZE;
    const w = 1 * scale;
    const h = 1 * scale;
    const rooms = Object.values(graph.rooms);

    const limit = 99;

    const rootRoom = graph.rooms[graph.startRoomId];
    assert(rootRoom);
    renderer.setStrokeColor(Color.WHITE);
    const allPaths = collectAllPaths(graph);
    graph.totalPaths = allPaths.length;
    const selectedPath = allPaths[graph.currentPathIndex];
    assert(selectedPath);
    drawRoomPath2(renderer, selectedPath);
    // drawRoomPath(renderer, rootRoom, graph);
    renderer.useCameraCoords(true);
    {
        renderer.setFont('24px sans-serif');
        renderer.fillText(`Total paths: ${graph.totalPaths}`, {
            x: 10,
            y: 30,
            color: Color.WHITE,
            shadowColor: Color.BLACK,
        });
        renderer.fillText(`Current path: ${graph.currentPathIndex + 1}`, {
            x: 10,
            y: 60,
            color: Color.WHITE,
            shadowColor: Color.BLACK,
        });
    }
    renderer.useCameraCoords(false);
}

function collectAllPaths(graph: WorldGraph): Room[][] {
    const results: Room[][] = [];

    function dfs(node: Room, path: Room[]): void {
        const exitRoomIds = Object.values(node.exits);
        if (exitRoomIds.length === 0) {
            const fullPath = [...path, node];
            assert(fullPath.length === graph.depth + 1);
            results.push(fullPath);
            return;
        }
        for (const roomId of exitRoomIds) {
            const nextRoom = graph.rooms[roomId];
            assert(nextRoom);
            dfs(nextRoom, [...path, node]);
        }
    }
    const start = graph.rooms[graph.startRoomId];
    assert(start);
    dfs(start, []);
    return results;
}

function drawRoomPath2(renderer: Renderer, path: Room[]): void {
    const scale = CELL_SIZE;
    const w = 0.9 * scale;
    const h = 0.9 * scale;
    const fontSize = 24 * renderer.camera.scale;
    renderer.setFont(`${fontSize}px sans-serif`);

    for (const room of path) {
        let {x, y} = room;
        x *= scale;
        y *= scale;
        renderer.setGlobalAlpha(0.3);
        renderer.setFillColor(Color.GREEN);
        renderer.fillRect(x, y, w, h);
        renderer.setGlobalAlpha(1);
        renderer.setFillColor(Color.BLACK);
        const text = room.depth.toString();
        const textOffset = 3;
        renderer.fillText(text, {x: x + textOffset, y: y + textOffset, color: Color.BLACK});
    }

    renderer.setStrokeColor(Color.WHITE);
    for (let i = 0; i < path.length - 1; i++) {
        const room = path[i];
        assert(room);

        const nextRoom = path[i + 1];
        if (nextRoom) {
            const x1 = room.x * CELL_SIZE + CELL_SIZE / 2;
            const y1 = room.y * CELL_SIZE + CELL_SIZE / 2;
            const x2 = nextRoom.x * CELL_SIZE + CELL_SIZE / 2;
            const y2 = nextRoom.y * CELL_SIZE + CELL_SIZE / 2;
            renderer.strokeLine(x1, y1, x2, y2, 1);
        }
    }
}

function drawRoomPath(renderer: Renderer, room: Room, world: WorldGraph): void {
    const nextRooms = Object.values(room.exits).map((id) => {
        const nextRoom = world.rooms[id];
        assert(nextRoom);
        return nextRoom;
    });
    for (const n of nextRooms) {
        drawRoomPath(renderer, n, world);
        const x1 = room.x * CELL_SIZE + CELL_SIZE / 2;
        const y1 = room.y * CELL_SIZE + CELL_SIZE / 2;
        const x2 = n.x * CELL_SIZE + CELL_SIZE / 2;
        const y2 = n.y * CELL_SIZE + CELL_SIZE / 2;
        renderer.strokeLine(x1, y1, x2, y2, 1);
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
