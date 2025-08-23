import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {type Vector2Like} from '#/math/vector'; // {x,y}
import {type Renderer} from '#/renderer';

type Direction = 'north' | 'south' | 'east' | 'west';

interface Room {
    id: string;
    x: number;
    y: number;
    depth: number;
    // Exits are undirected "holes" in the walls to adjacent rooms.
    exits: Partial<Record<Direction, string>>; // maps direction -> neighbor room id
}

interface WorldGraph {
    rooms: Record<string, Room>;
    startRoomId: string;
    maxDepth: number;
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
    const {depth, maxExitsPerRoom, finalRoomsCount, mergeBias = 0.4, rng = Math.random} = options;

    // Validate inputs
    if (depth < 1) throw new Error('Depth must be >= 1');
    if (maxExitsPerRoom < 1 || maxExitsPerRoom > 3) {
        throw new Error('maxExitsPerRoom must be between 1 and 3');
    }
    if (finalRoomsCount < 1) throw new Error('finalRoomsCount must be >= 1');

    // Keep trying until we get a valid world graph
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
        try {
            const result = generateValidWorldGraph();
            // Validate the generated graph
            if (validateGraph(result)) {
                return result;
            }
        } catch (error) {
            attempts++;
            if (attempts === maxAttempts) {
                throw new Error('Failed to generate valid world graph after maximum attempts');
            }
        }
    }

    function validateGraph(graph: WorldGraph): boolean {
        const rooms = Object.values(graph.rooms);

        // Check if we have the correct number of final rooms
        const finalRooms = rooms.filter((room) => room.depth === depth);
        if (finalRooms.length !== finalRoomsCount) {
            return false;
        }

        // Verify path continuity for each room
        for (const room of rooms) {
            // Skip start room
            if (room.depth === 0) continue;

            // Each non-start room must have exactly one connection to a room with depth - 1
            const hasValidParent = Object.entries(room.exits).some(([dir, neighborId]) => {
                const neighbor = graph.rooms[neighborId]!;
                return neighbor.depth === room.depth - 1;
            });

            if (!hasValidParent) {
                return false;
            }
        }

        // Verify no missing depths in paths
        const depthsPresent = new Set(rooms.map((r) => r.depth));
        for (let d = 0; d <= depth; d++) {
            if (!depthsPresent.has(d)) {
                return false;
            }
        }

        return true;
    }

    function generateValidWorldGraph(): WorldGraph {
        const rooms: Record<string, Room> = {};
        let currentRoomId = 0;

        function createRoom(x: number, y: number, roomDepth: number): Room {
            const id = (currentRoomId++).toString();
            const room: Room = {
                id,
                x,
                y,
                depth: roomDepth,
                exits: {},
            };
            rooms[id] = room;
            return room;
        }

        function connectRooms(room1: Room, room2: Room) {
            // Only allow connections between adjacent depths
            if (Math.abs(room1.depth - room2.depth) !== 1) {
                throw new Error('Invalid connection: rooms must be of adjacent depths');
            }

            const direction = getDirection(room1, room2);
            const oppositeDirection: Record<Direction, Direction> = {
                north: 'south',
                south: 'north',
                east: 'west',
                west: 'east',
            };

            room1.exits[direction] = room2.id;
            room2.exits[oppositeDirection[direction]] = room1.id;
        }

        function getDirection(room1: Room, room2: Room): Direction {
            if (room1.x === room2.x) {
                return room1.y < room2.y ? 'south' : 'north';
            }
            return room1.x < room2.x ? 'east' : 'west';
        }

        const startRoom = createRoom(0, 0, 0);
        const usedPositions = new Map<string, Room>();
        usedPositions.set('0,0', startRoom);

        const roomsByDepth: Room[][] = Array(depth + 1)
            .fill(null)
            .map(() => []);
        roomsByDepth[0]!.push(startRoom);

        function isValidPosition(pos: Vector2Like, targetDepth: number): boolean {
            const posKey = `${pos.x},${pos.y}`;
            const existingRoom = usedPositions.get(posKey);
            if (!existingRoom) return true;
            // Allow position if it's the same depth and can be merged
            return (
                existingRoom.depth === targetDepth &&
                Object.keys(existingRoom.exits).length < maxExitsPerRoom
            );
        }

        function getValidDirections(room: Room, targetDepth: number): Direction[] {
            return (['north', 'south', 'east', 'west'] as const).filter((dir) => {
                const newPos = getNewPosition(room, dir as Direction);
                return isValidPosition(newPos, targetDepth);
            });
        }

        function generatePath(currentRoom: Room, remainingDepth: number): boolean {
            if (remainingDepth === 0) {
                return true;
            }

            const targetDepth = depth - remainingDepth + 1;
            const validDirections = getValidDirections(currentRoom, targetDepth);
            shuffleArray(validDirections, rng);

            for (const direction of validDirections) {
                const newPos = getNewPosition(currentRoom, direction);
                const posKey = `${newPos.x},${newPos.y}`;
                const existingRoom = usedPositions.get(posKey);

                let nextRoom: Room;
                if (existingRoom && rng() < mergeBias) {
                    nextRoom = existingRoom;
                } else {
                    nextRoom = createRoom(newPos.x, newPos.y, targetDepth);
                    roomsByDepth[targetDepth]!.push(nextRoom);
                    usedPositions.set(posKey, nextRoom);
                }

                try {
                    connectRooms(currentRoom, nextRoom);
                    if (generatePath(nextRoom, remainingDepth - 1)) {
                        return true;
                    }
                } catch (error) {
                    // If connection failed or path generation failed, cleanup and try next direction
                    if (nextRoom.depth === targetDepth) {
                        delete rooms[nextRoom.id];
                        usedPositions.delete(posKey);
                        roomsByDepth[targetDepth] = roomsByDepth[targetDepth]!.filter(
                            (r) => r.id !== nextRoom.id,
                        );
                    }
                    delete currentRoom.exits[direction];
                    delete nextRoom.exits[getDirection(nextRoom, currentRoom)];
                    continue;
                }
            }

            return false;
        }

        // Generate multiple paths to meet finalRoomsCount
        let successfulPaths = 0;
        let pathAttempts = 0;
        const maxPathAttempts = 50;

        while (successfulPaths < finalRoomsCount && pathAttempts < maxPathAttempts) {
            if (generatePath(startRoom, depth)) {
                successfulPaths++;
            }
            pathAttempts++;
        }

        if (successfulPaths < finalRoomsCount) {
            throw new Error('Failed to generate required number of paths');
        }

        return {
            rooms,
            startRoomId: startRoom.id,
            maxDepth: depth,
        };
    }

    throw new Error('Failed to generate world graph');
}

// Helper functions remain the same
function getNewPosition(room: Room, direction: Direction): Vector2Like {
    switch (direction) {
        case 'north':
            return {x: room.x, y: room.y - 1};
        case 'south':
            return {x: room.x, y: room.y + 1};
        case 'east':
            return {x: room.x + 1, y: room.y};
        case 'west':
            return {x: room.x - 1, y: room.y};
    }
}

function shuffleArray<T>(array: T[], rng: () => number): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [array[i], array[j]] = [array[j]!, array[i]!];
    }
}

export function drawWorldGraph(renderer: Renderer, graph: WorldGraph): void {
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
    renderer.setFillColor(Color.BLACK);
    renderer.setGlobalAlpha(0.3);
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
    renderer.setGlobalAlpha(1);
    renderer.setFillColor(Color.BLACK);
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
    renderer.useCameraCoords(false);
}
