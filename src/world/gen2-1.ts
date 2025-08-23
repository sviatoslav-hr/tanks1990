import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {Vector2Like} from '#/math/vector';
import {Renderer} from '#/renderer';

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
        // Determine direction based on relative positions
        let direction: Direction;
        if (room1.x === room2.x) {
            direction = room1.y < room2.y ? 'south' : 'north';
        } else {
            direction = room1.x < room2.x ? 'east' : 'west';
        }

        const oppositeDirection: Record<Direction, Direction> = {
            north: 'south',
            south: 'north',
            east: 'west',
            west: 'east',
        };

        room1.exits[direction] = room2.id;
        room2.exits[oppositeDirection[direction]] = room1.id;
    }

    // Start with a single room at depth 0
    const startRoom = createRoom(0, 0, 0);
    let currentLayer = [startRoom];

    // Keep track of available positions in the next layer
    const usedPositions = new Set<string>();
    usedPositions.add('0,0');

    // Generate each layer
    for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
        const nextLayer: Room[] = [];
        const isLastLayer = currentDepth === depth;

        // For each room in current layer
        for (const currentRoom of currentLayer) {
            // Determine number of exits for this room (1-3)
            const maxExits = isLastLayer
                ? 1
                : Math.min(
                      maxExitsPerRoom,
                      // Ensure we can reach finalRoomsCount
                      Math.ceil(
                          (finalRoomsCount - nextLayer.length) /
                              (currentLayer.length - currentLayer.indexOf(currentRoom)),
                      ),
                  );

            // Generate possible directions
            const possibleDirections: Direction[] = (
                ['north', 'south', 'east', 'west'] as const
            ).filter((dir) => {
                const newPos = getNewPosition(currentRoom, dir as Direction);
                const posKey = `${newPos.x},${newPos.y}`;
                return !usedPositions.has(posKey);
            });

            // Randomly select directions
            const exitCount = Math.max(1, Math.min(maxExits, possibleDirections.length));

            // Shuffle and take required number of directions
            shuffleArray(possibleDirections, rng);
            const selectedDirections = possibleDirections.slice(0, exitCount);

            // Create rooms in selected directions
            for (const direction of selectedDirections) {
                const newPos = getNewPosition(currentRoom, direction);
                const posKey = `${newPos.x},${newPos.y}`;

                // Check if we should merge with an existing room
                const existingRoom = findRoomAtPosition(nextLayer, newPos);
                if (
                    existingRoom &&
                    rng() < mergeBias &&
                    Object.keys(existingRoom.exits).length < maxExitsPerRoom
                ) {
                    connectRooms(currentRoom, existingRoom);
                } else {
                    const newRoom = createRoom(newPos.x, newPos.y, currentDepth);
                    connectRooms(currentRoom, newRoom);
                    nextLayer.push(newRoom);
                    usedPositions.add(posKey);
                }
            }
        }

        currentLayer = nextLayer;
    }

    return {
        rooms,
        startRoomId: startRoom.id,
        maxDepth: depth,
    };
}

// Helper function to get new position based on direction
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

// Helper function to find a room at a specific position
function findRoomAtPosition(rooms: Room[], pos: Vector2Like): Room | undefined {
    return rooms.find((room) => room.x === pos.x && room.y === pos.y);
}

// Helper function to shuffle array
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

    // renderer.useCameraCoords(true);
    renderer.setFillColor(Color.GREEN);
    for (const room of rooms) {
        let {x, y} = room;
        x *= scale;
        y *= scale;
        renderer.fillRect(x, y, w, h);
    }
    renderer.setFillColor(Color.BLACK);
    renderer.setGlobalAlpha(0.3);
    for (const room of rooms) {
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
