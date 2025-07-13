import {CELL_SIZE} from '#/const';
import {Block, generateBlocks} from '#/entity/block';
import {wavesPerRoom} from '#/entity/enemy-wave';
import {EntityManager} from '#/entity/manager';
import {Direction, oppositeDirection} from '#/math/direction';
import {random} from '#/math/rng';
import {Vector2} from '#/math/vector';
import {createStaticSprite} from '#/renderer/sprite';
import {Room, roomSizeInCells} from '#/world/room';

export const MAX_ROOMS_COUNT = wavesPerRoom.length;

// TODO: Figure out generation algorithm that would avoid overlapping rooms
export function generateDungeon(
    startRoomPosition: Vector2,
    manager: EntityManager,
    roomsCount: number,
): Room[] {
    assert(roomsCount <= MAX_ROOMS_COUNT);
    const rooms: Room[] = [];
    const roomPosition = startRoomPosition.clone();
    for (let i = 0; i < roomsCount; i++) {
        const prevRoom = rooms[i - 1];
        if (prevRoom) {
            roomPosition.setFrom(prevRoom.position);
            switch (prevRoom.nextRoomDir) {
                case Direction.NORTH:
                    roomPosition.y -= roomSizeInCells.height * CELL_SIZE + CELL_SIZE;
                    break;
                case Direction.EAST:
                    roomPosition.x += roomSizeInCells.width * CELL_SIZE + CELL_SIZE;
                    break;
                case Direction.SOUTH:
                    roomPosition.y += roomSizeInCells.height * CELL_SIZE + CELL_SIZE;
                    break;
                case Direction.WEST:
                    roomPosition.x -= roomSizeInCells.width * CELL_SIZE + CELL_SIZE;
                    break;
            }
        }
        const room = generateRoom(roomPosition.clone(), roomSizeInCells, manager, prevRoom);
        rooms.push(room);
    }
    return rooms;
}

// TODO: Custom random number generator for deterministic generation
function generateRoom(
    roomPosition: Vector2,
    sizeInCells: Vector2,
    manager: EntityManager,
    prevRoom: Room | null = null,
): Room {
    const sprite = createStaticSprite({
        key: 'bricks',
        frameWidth: 64,
        frameHeight: 64,
    });

    const prevDir = prevRoom?.nextRoomDir != null ? oppositeDirection(prevRoom.nextRoomDir) : null;
    // TODO: South direction is excluded for now to avoid cyclic room structure.
    //       In future this should be replaced with a better generation algorithm.
    const dirs = [Direction.NORTH, Direction.EAST, /*Direction.SOUTH,*/ Direction.WEST];
    if (prevDir) {
        dirs.splice(dirs.indexOf(prevDir), 1);
    }

    const nextDoorDir = prevRoom != null ? random.selectFrom(...dirs) : Direction.NORTH;
    // NOTE: Room reuses common border blocks with the previous room
    const nextRoomBlocks: Block[] = [];
    const blocks: Block[] = prevRoom?.nextRoomCommonBlocks?.slice() ?? [];
    const cellSize = CELL_SIZE;

    // north and south walls
    const minX = roomPosition.x - (sizeInCells.width / 2) * cellSize;
    for (let x = -1; x <= sizeInCells.width; x += 1) {
        // NOTE: north and south walls also include the corners
        if (x === -1 && prevDir === Direction.WEST) {
            continue;
        }
        if (x === sizeInCells.width && prevDir === Direction.EAST) {
            continue;
        }
        if (prevDir !== Direction.NORTH) {
            const northBlock = new Block(manager, {
                x: x * cellSize + minX,
                y: roomPosition.y - (sizeInCells.height / 2 + 1) * cellSize,
                width: cellSize,
                height: cellSize,
                texture: sprite,
            });
            blocks.push(northBlock);
            if (nextDoorDir === Direction.NORTH) nextRoomBlocks.push(northBlock);
        }
        if (prevDir !== Direction.SOUTH) {
            const southBlock = new Block(manager, {
                x: x * cellSize + minX,
                y: roomPosition.y + (sizeInCells.height / 2) * cellSize,
                width: cellSize,
                height: cellSize,
                texture: sprite,
            });
            blocks.push(southBlock);
            if (nextDoorDir === Direction.SOUTH) nextRoomBlocks.push(southBlock);
        }
    }

    // west and east walls
    const minY = roomPosition.y - (sizeInCells.height / 2) * cellSize;
    for (let y = 0; y < sizeInCells.height; y += 1) {
        if (prevDir !== Direction.WEST) {
            const westBlock = new Block(manager, {
                x: roomPosition.x - (sizeInCells.width / 2 + 1) * cellSize,
                y: y * cellSize + minY,
                width: cellSize,
                height: cellSize,
                texture: sprite,
            });
            blocks.push(westBlock);
            if (nextDoorDir === Direction.WEST) nextRoomBlocks.push(westBlock);
        }
        if (prevDir !== Direction.EAST) {
            const eastBlock = new Block(manager, {
                x: roomPosition.x + (sizeInCells.width / 2) * cellSize,
                y: y * cellSize + minY,
                width: cellSize,
                height: cellSize,
                texture: sprite,
            });
            blocks.push(eastBlock);
            if (nextDoorDir === Direction.EAST) nextRoomBlocks.push(eastBlock);
        }
    }

    const room = new Room(roomPosition, sizeInCells, blocks, prevRoom, nextDoorDir, nextRoomBlocks);
    const blocksCount = random.int32Range(16, 24);
    const insideBlocks = generateBlocks(manager, room.boundary, blocksCount, manager.player);
    room.blocks.push(...insideBlocks);

    return room;
}
