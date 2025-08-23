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
    const maxAttempts = 100; // Prevent infinite loops

    while (attempts < maxAttempts) {
        try {
            return generateValidWorldGraph();
        } catch (error) {
            attempts++;
            if (attempts === maxAttempts) {
                throw new Error('Failed to generate valid world graph after maximum attempts');
            }
        }
    }

    function generateValidWorldGraph(): WorldGraph {
        const rooms: Record<string, Room> = {};
        let currentRoomId = 0;

        // Helper to create a new room
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

        // Helper to connect two rooms
        function connectRooms(room1: Room, room2: Room) {
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

        // Get direction from room1 to room2
        function getDirection(room1: Room, room2: Room): Direction {
            if (room1.x === room2.x) {
                return room1.y < room2.y ? 'south' : 'north';
            } else {
                return room1.x < room2.x ? 'east' : 'west';
            }
        }

        // Start with a single room at depth 0
        const startRoom = createRoom(0, 0, 0);
        const usedPositions = new Map<string, Room>(); // Track all used positions
        usedPositions.set('0,0', startRoom);

        // Track rooms by depth for validation
        const roomsByDepth: Room[][] = Array(depth + 1)
            .fill(null)
            .map(() => []);
        roomsByDepth[0]!.push(startRoom);

        // Helper to check if a position is valid and available
        function isValidPosition(pos: Vector2Like): boolean {
            return !usedPositions.has(`${pos.x},${pos.y}`);
        }

        // Helper to get valid directions for expansion
        function getValidDirections(room: Room): Direction[] {
            return (['north', 'south', 'east', 'west'] as const).filter((dir) => {
                const newPos = getNewPosition(room, dir as Direction);
                return isValidPosition(newPos);
            });
        }

        // Generate paths recursively
        function generatePath(currentRoom: Room, currentDepth: number): boolean {
            if (currentDepth === depth) {
                return true; // Successfully reached target depth
            }

            const validDirections = getValidDirections(currentRoom);
            shuffleArray(validDirections, rng);

            for (const direction of validDirections) {
                const newPos = getNewPosition(currentRoom, direction);
                const posKey = `${newPos.x},${newPos.y}`;

                // Check for existing room at next depth
                const existingRooms = roomsByDepth[currentDepth + 1]!;
                const nearbyRoom = existingRooms.find(
                    (r) =>
                        Math.abs(r.x - newPos.x) <= 1 &&
                        Math.abs(r.y - newPos.y) <= 1 &&
                        Object.keys(r.exits).length < maxExitsPerRoom,
                );

                let nextRoom: Room;
                if (nearbyRoom && rng() < mergeBias) {
                    // Merge path by connecting to existing room
                    nextRoom = nearbyRoom;
                } else {
                    // Create new room
                    nextRoom = createRoom(newPos.x, newPos.y, currentDepth + 1);
                    roomsByDepth[currentDepth + 1]!.push(nextRoom);
                    usedPositions.set(posKey, nextRoom);
                }

                connectRooms(currentRoom, nextRoom);

                // Continue path from new room
                if (generatePath(nextRoom, currentDepth + 1)) {
                    return true;
                }

                // If path failed, backtrack by removing the room and connection
                if (nextRoom.depth === currentDepth + 1) {
                    // Only remove newly created rooms
                    delete rooms[nextRoom.id];
                    usedPositions.delete(posKey);
                    roomsByDepth[currentDepth + 1] = roomsByDepth[currentDepth + 1]!.filter(
                        (r) => r.id !== nextRoom.id,
                    );
                }
                delete currentRoom.exits[direction];
                delete nextRoom.exits[getDirection(nextRoom, currentRoom)];
            }

            return false; // No valid path found
        }

        // Generate multiple paths to meet finalRoomsCount
        let pathsGenerated = 0;
        while (pathsGenerated < finalRoomsCount) {
            if (!generatePath(startRoom, 0)) {
                throw new Error('Failed to generate required paths');
            }
            pathsGenerated++;
        }

        // Validate final room count
        const finalRooms = Object.values(rooms).filter((room) => room.depth === depth);
        if (finalRooms.length !== finalRoomsCount) {
            throw new Error('Failed to generate required number of final rooms');
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
