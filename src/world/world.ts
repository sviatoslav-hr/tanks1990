import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {Block} from '#/entity/block';
import {EntityManager} from '#/entity/manager';
import {Vector2} from '#/math/vector';
import {generateDungeon, MAX_ROOMS_COUNT} from '#/world/generation';
import {Room} from '#/world/room';

export class World {
    roomsLimit = MAX_ROOMS_COUNT;
    activeRoom = Room.temp();
    activeRoomInFocus = false;
    rooms: Room[] = [];

    readonly startRoomPosition = new Vector2(0, 0);
    readonly bgColor = Color.BLACK_IERIE;
    readonly gridColor = Color.BLACK_ONYX;
    readonly boundaryThickness = 0.1 * CELL_SIZE;

    init(manager: EntityManager): void {
        this.rooms = generateDungeon(this.startRoomPosition, manager, this.roomsLimit);
        const startRoom = this.rooms[0];
        assert(startRoom);
        this.activeRoom = startRoom;
    }

    update(manager: EntityManager): void {
        this.activeRoom?.update(manager);
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
