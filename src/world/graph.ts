import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {
    ALL_DIRECTIONS,
    Direction,
    getDirectionBetween,
    getOppositeDirection,
} from '#/math/direction';
import {random} from '#/math/rng';
import {v2AddMut, v2Equals, v2ManhattanDistance, type Vector2Like} from '#/math/vector'; // {x,y}
import {type Renderer} from '#/renderer';

export interface WorldNode {
    x: number;
    y: number;
    depth: number;
    // Conections are undirected "holes" in the walls to adjacent nodes.
    // Connections can be: entrances (prev depth) and exits (next depth).
    connectedNodes: Partial<Record<Direction, WorldNode>>;
}

export interface WorldGraph {
    startNode: WorldNode;
    finalNodes: WorldNode[];
    depth: number;
    isFullyVisible: boolean;
    debugPaths: WorldNode[][];
}

interface WorldGraphOptions {
    depth: number; // >= 1
    /** Hard cap: number of unique leaf rooms (depth === maxDepth). Must be >= 1. */
    finalNodesCount: number;
}

export function generateWorldGraph(options: WorldGraphOptions): WorldGraph {
    const {depth, finalNodesCount} = options;

    const startNode: WorldNode = {x: 0, y: 0, depth: 1, connectedNodes: {}};
    const finalNodes = createWorldFinalNodes(startNode, depth, finalNodesCount);
    const ctx = new WorldGraphContext(depth, startNode, finalNodes);
    ctx.positionRooms.set(getPositionKey(startNode), startNode);
    for (const finalNode of finalNodes) {
        ctx.positionRooms.set(getPositionKey(finalNode), finalNode);
    }

    const pathFound = findWorldRoomPaths(ctx, startNode);
    assert(pathFound, 'No valid path found');
    for (const finalNode of finalNodes) {
        const prevNodes = getPrevDepthWorldNodes(finalNode);
        assert(prevNodes.length > 0, `Final node ${getWorldNodeKey(finalNode)} has no valid paths`);
    }
    const graph: WorldGraph = {
        startNode,
        finalNodes,
        depth: depth,
        isFullyVisible: true,
        debugPaths: [],
    };
    graph.debugPaths = collectAllPaths(graph);
    return graph;
}

function createWorldFinalNodes(startNode: WorldNode, depth: number, count: number): WorldNode[] {
    assert(depth >= 4);
    let finalRoomDistance = Math.max(1, Math.floor(depth / 3));
    // NOTE: If depth is even, distance to final must be even too, for path to be valid.
    //       And vice versa for odd depths.
    if (depth % 2 === 0 && finalRoomDistance % 2 === 0) {
        finalRoomDistance++;
    } else if (depth % 2 === 1 && finalRoomDistance % 2 === 1) {
        finalRoomDistance++;
    }
    const points = getNCirclePoints(startNode.x, startNode.y, count, finalRoomDistance);
    const finalNodes: WorldNode[] = points.map((point) => ({
        x: point[0],
        y: point[1],
        depth: depth,
        connectedNodes: {},
    }));
    return finalNodes;
}
function getNCirclePoints(
    cx: number,
    cy: number,
    count: number,
    distance: number,
): [number, number][] {
    if (count <= 0 || distance < 0) return [];
    if (distance === 0) return [[cx, cy]];

    const out: [number, number][] = [];
    for (let k = 0; k < count; k++) {
        const theta = (2 * Math.PI * k) / count; // 0°, 120°, 240°, etc.
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        const sum = Math.abs(c) + Math.abs(s) || 1; // guard against 0

        // Proportionally allocate the L1 radius to x vs y by direction
        const ax = Math.round((distance * Math.abs(c)) / sum);
        const ay = distance - ax;

        const dx = (c >= 0 ? 1 : -1) * ax;
        const dy = (s >= 0 ? 1 : -1) * ay;

        out.push([cx + dx, cy + dy]);
    }
    return out;
}

function findWorldRoomPaths(ctx: WorldGraphContext, sourceRoom: WorldNode): boolean {
    let hasAnyPathToFinal = false;
    const finalNodes = ctx.finalNodes;
    const sourceDirections = random.shuffle(ALL_DIRECTIONS.slice());
    // const sourceDirections = ALL_DIRECTIONS;
    for (const directionFromSource of sourceDirections) {
        const nextRoom: WorldNode = {
            x: sourceRoom.x,
            y: sourceRoom.y,
            depth: sourceRoom.depth + 1,
            connectedNodes: {},
        };
        v2AddMut(nextRoom, getDirectionOffset(directionFromSource));
        const directionToSource = getOppositeDirection(directionFromSource);
        // Connect source room right away to be able to backtrack to check for collisions
        nextRoom.connectedNodes[directionToSource] = sourceRoom;

        const roomKey = getWorldNodeKey(nextRoom);
        if (ctx.invalidRooms.has(roomKey)) continue;

        let reachableFinalCount = finalNodes.length;
        for (const final of finalNodes) {
            if (v2Equals(nextRoom, final)) {
                reachableFinalCount = 0;
                break;
            }

            // NOTE: If manhattan distance is greater than depth difference between the next room
            //       and final room, this path cannot reach the final room.
            //       So, if that's true for every final room, the path is invalid.
            const manhattan = v2ManhattanDistance(nextRoom, final);
            const dDepth = final.depth - nextRoom.depth;
            assert(dDepth > 0);
            if (manhattan > dDepth) {
                reachableFinalCount--;
            }
        }

        if (!reachableFinalCount) {
            ctx.invalidRooms.add(roomKey);
            continue;
        }

        let nextHasPathToFinal = false;
        const positionKey = getPositionKey(nextRoom);
        const existingRoom = ctx.positionRooms.get(positionKey);
        if (existingRoom) {
            // NOTE: If such room already exists (from other paths), reuse it for this path as well.
            //       But depth should match to maintain the same path distance.
            if (existingRoom.depth === nextRoom.depth) {
                const existingRoomConnection = existingRoom.connectedNodes[directionToSource];
                if (existingRoomConnection) {
                    assert(existingRoomConnection === sourceRoom);
                }
                existingRoom.connectedNodes[directionToSource] = sourceRoom;
                sourceRoom.connectedNodes[directionFromSource] = existingRoom;
                hasAnyPathToFinal = true;
                continue;
            }
        } else if (prevRoomExistsAt(sourceRoom, nextRoom)) {
            // Room is invalid if it collides with any previous room in the path
        } else if (nextRoom.depth === ctx.maxDepth - 1) {
            const finalNeighbor = finalNodes.find((f) => areNeighborPositions(nextRoom, f));
            if (finalNeighbor) {
                const finalDirection = getDirectionBetween(nextRoom, finalNeighbor);
                assert(finalDirection != null);
                const oppositeFinalDirection = getOppositeDirection(finalDirection);
                assert(
                    !finalNeighbor.connectedNodes[oppositeFinalDirection],
                    'Final room is already connected',
                );
                nextRoom.connectedNodes[finalDirection] = finalNeighbor;
                finalNeighbor.connectedNodes[oppositeFinalDirection] = nextRoom;
                nextHasPathToFinal = true;
            }
        } else {
            // NOTE: We need path separately because we don't attach nextNode util all its children are calculated.
            const foundFinalPath = findWorldRoomPaths(ctx, nextRoom);
            if (foundFinalPath) nextHasPathToFinal = true;
        }

        if (nextHasPathToFinal) {
            // NOTE: Source room should be connected only once we know next room has path towards the final room.
            //       That way we can rely on graph having only valid paths.
            assert(
                !sourceRoom.connectedNodes[directionFromSource],
                `Source room ${getWorldNodeKey(sourceRoom)} is already connected`,
            );
            sourceRoom.connectedNodes[directionFromSource] = nextRoom;
            ctx.positionRooms.set(positionKey, nextRoom);
            hasAnyPathToFinal = true;
        } else {
            ctx.invalidRooms.add(roomKey);
        }
    }

    return hasAnyPathToFinal;
}

class WorldGraphContext {
    maxDepth: number;
    startNode: WorldNode;
    finalNodes: WorldNode[];
    positionRooms: Map<PositionKey, WorldNode> = new Map();
    invalidRooms: Set<WorldNodeKey> = new Set();

    constructor(maxDepth: number, startRoom: WorldNode, finalNodes: WorldNode[]) {
        assert(finalNodes.length > 0, 'At least one final node must be provided');
        for (const f of finalNodes) {
            assert(!v2Equals(startRoom, f), 'Start and final rooms must have different positions');
            assert(f.depth === maxDepth, 'Final room must have max depth');
        }
        this.maxDepth = maxDepth;
        this.startNode = startRoom;
        this.finalNodes = finalNodes;
    }
}

const ROOM_OFFSET = 1;
function getDirectionOffset(d: Direction): Vector2Like {
    switch (d) {
        case Direction.NORTH:
            // NOTE: In js world y coordinate is inverted...
            return {x: 0, y: -ROOM_OFFSET};
        case Direction.SOUTH:
            return {x: 0, y: ROOM_OFFSET};
        case Direction.EAST:
            return {x: ROOM_OFFSET, y: 0};
        case Direction.WEST:
            return {x: -ROOM_OFFSET, y: 0};
    }
}

function areNeighborPositions(r1: Vector2Like, r2: Vector2Like): boolean {
    const dx = Math.abs(r1.x - r2.x);
    const dy = Math.abs(r1.y - r2.y);
    return (dx === ROOM_OFFSET && dy === 0) || (dx === 0 && dy === ROOM_OFFSET);
}

function prevRoomExistsAt(source: WorldNode, pos: Vector2Like): boolean {
    const prevRooms = getPrevDepthWorldNodes(source);
    for (const prevRoom of prevRooms) {
        if (v2Equals(prevRoom, pos)) return true;
        if (prevRoomExistsAt(prevRoom, pos)) return true;
    }
    return false;
}

export function getNextDepthWorldNodes(room: WorldNode): WorldNode[] {
    const result: WorldNode[] = [];
    for (const exitRoom of Object.values(room.connectedNodes)) {
        if (exitRoom.depth > room.depth) {
            assert(exitRoom.depth === room.depth + 1);
            result.push(exitRoom);
        }
    }
    return result;
}

export function getPrevDepthWorldNodes(room: WorldNode): WorldNode[] {
    const result: WorldNode[] = [];
    for (const entranceRoom of Object.values(room.connectedNodes)) {
        if (entranceRoom.depth < room.depth) {
            assert(entranceRoom.depth === room.depth - 1);
            result.push(entranceRoom);
        }
    }
    return result;
}

export function getWorldNodeDirections(room: WorldNode): {next: Direction[]; prev: Direction[]} {
    const entries = Object.entries(room.connectedNodes) as [Direction, WorldNode][];
    const next: Direction[] = [];
    const prev: Direction[] = [];
    for (const [direction, nextRoom] of entries) {
        if (nextRoom.depth > room.depth) {
            next.push(direction);
        } else if (nextRoom.depth < room.depth) {
            prev.push(direction);
        } else {
            assert(false, `Unexpected depth equality: ${nextRoom.depth} === ${room.depth}`);
        }
    }
    return {next, prev};
}

function collectAllPaths(graph: WorldGraph): WorldNode[][] {
    const results: WorldNode[][] = [];

    function dfs(node: WorldNode, path: WorldNode[] = [node]): void {
        assert(path.length > 0);
        assert(path.length <= graph.depth);
        const nextNodes = getNextDepthWorldNodes(node);
        if (nextNodes.length === 0) {
            assert(path.length === graph.depth);
            results.push(path);
            return;
        }
        for (const nextNode of nextNodes) {
            dfs(nextNode, [...path, nextNode]);
        }
    }
    dfs(graph.startNode);
    return results;
}

type PositionKey = `${number},${number}` & {__brand: 'PositionKey'};

function getPositionKey(p: Vector2Like): PositionKey {
    return `${p.x},${p.y}` as PositionKey;
}

export type WorldNodeKey = `{${number},${number}}-${number}` & {__brand: 'WOrldNodeKey'};

export function getWorldNodeKey(room: WorldNode): WorldNodeKey {
    return `{${room.x},${room.y}}-${room.depth}` as WorldNodeKey;
}

export function* bfsWorldGraph(startRoom: WorldNode): Generator<WorldNode> {
    const visited = new Set<WorldNodeKey>();
    const rooms = [startRoom];
    let room: WorldNode | undefined;
    while ((room = rooms.shift())) {
        const key = getWorldNodeKey(room);
        if (visited.has(key)) continue;
        visited.add(key);

        yield room;
        const childRooms = getNextDepthWorldNodes(room);
        rooms.push(...childRooms);
    }
}

export function* dfsWorldGraph(
    startRoom: WorldNode,
    visited = new Set<WorldNodeKey>(),
): Generator<WorldNode, void> {
    const key = getWorldNodeKey(startRoom);
    if (visited.has(key)) return;
    visited.add(key);

    yield startRoom;
    const childRooms = getNextDepthWorldNodes(startRoom);
    for (const child of childRooms) {
        yield* dfsWorldGraph(child, visited);
    }
}

export function drawWorldGraph(renderer: Renderer, graph: WorldGraph): void {
    renderer.setGlobalAlpha(0.3);
    const scale = 0.9;
    const w = scale * CELL_SIZE;
    const h = scale * CELL_SIZE;
    const rooms = Array.from(bfsWorldGraph(graph.startNode));
    const visited = new Set<string>();

    renderer.setFillColor(Color.GREEN);
    for (const room of rooms) {
        const key = getWorldNodeKey(room);
        if (visited.has(key)) continue;
        let {x, y} = room;
        x *= CELL_SIZE;
        y *= CELL_SIZE;
        renderer.fillRect(x, y, w, h);
        visited.add(key);
    }

    visited.clear();
    renderer.setFillColor(Color.BLACK + 'bf');
    renderer.setGlobalAlpha(0.6);
    for (const room of rooms) {
        const connectedEntries = Object.entries(room.connectedNodes) as [Direction, WorldNode][];
        for (const [dir, connectedRoom] of connectedEntries) {
            if (connectedRoom.depth < room.depth) continue;
            const key = `${getPositionKey(room)}-${dir}`;
            if (visited.has(key)) continue;
            let {x: dx, y: dy} = room;
            dx *= CELL_SIZE;
            dy *= CELL_SIZE;
            let dw = w / 2;
            let dh = h / 2;
            let doffset = w / 5;
            switch (dir) {
                case 'north': {
                    dh = h / 1.5;
                    dw = w / 8;
                    dx += w / 2 - dw / 2;
                    dy += -doffset;
                    break;
                }
                case 'south': {
                    dh = h / 1.5;
                    dw = w / 8;
                    dx += w / 2 - dw / 2;
                    dy += h - dh + doffset;
                    break;
                }
                case 'west': {
                    dw = w / 1.5;
                    dh = h / 8;
                    dx += -doffset;
                    dy += h / 2 - dh / 2;
                    break;
                }
                case 'east': {
                    dw = w / 1.5;
                    dh = h / 8;
                    dx += w - dw + doffset;
                    dy += h / 2 - dh / 2;
                    break;
                }
            }
            renderer.fillRect(dx, dy, dw, dh);
            visited.add(key);
        }
    }

    visited.clear();
    const textOffset = 3;
    const fontSize = 24 * renderer.camera.scale;
    renderer.setFont(`${fontSize}px sans-serif`);
    renderer.setGlobalAlpha(1);
    for (const room of rooms) {
        const key = getWorldNodeKey(room);
        if (visited.has(key)) continue;
        let {x, y} = room;
        x *= CELL_SIZE;
        y *= CELL_SIZE;
        x += textOffset;
        y += textOffset;
        const text = room.depth.toString();
        renderer.fillText(text, {x, y, color: Color.BLACK});
        visited.add(key);
    }
}
