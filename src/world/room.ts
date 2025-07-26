import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {PlayerTank} from '#/entity';
import {Block} from '#/entity/block';
import {Entity, isIntesecting} from '#/entity/core';
import {EnemyWave, wavesPerRoom} from '#/entity/enemy-wave';
import {EntityManager} from '#/entity/manager';
import {Pickup} from '#/entity/pickup';
import {Rect} from '#/math';
import {Direction} from '#/math/direction';
import {Vector2} from '#/math/vector';

export const roomSizeInCells = new Vector2(12, 8);

export class Room {
    started = false;
    readonly boundaryColor = Color.RED;
    readonly boundary: Rect;
    readonly nextRoomTransitionRect: Rect;
    nextRoom: Room | null = null;
    nextRoomDoorOpen = false;
    prevRoomDoorBlocks: Block[];
    roomIndex: number;
    wave: EnemyWave;
    pickups: Pickup[] = [];

    constructor(
        public position: Vector2,
        public sizeInCells: Vector2,
        public blocks: Block[],
        public prevRoom: Room | null,
        public nextRoomDir: Direction,
        public readonly nextRoomCommonBlocks: Block[],
    ) {
        this.boundary = {
            x: this.position.x - 0.5 * CELL_SIZE * this.sizeInCells.width,
            y: this.position.y - 0.5 * CELL_SIZE * this.sizeInCells.height,
            width: CELL_SIZE * this.sizeInCells.width,
            height: CELL_SIZE * this.sizeInCells.height,
        };
        if (prevRoom) {
            prevRoom.nextRoom = this;
        }
        this.nextRoomTransitionRect = this.makeNextRoomTransitionRect(
            position,
            sizeInCells,
            this.nextRoomDir,
        );
        this.roomIndex = prevRoom ? prevRoom.roomIndex + 1 : 0;
        {
            const wave = wavesPerRoom[this.roomIndex];
            assert(wave);
            wave.reset();
            this.wave = wave;
        }
        const prevRoomCommonBlocks = prevRoom?.nextRoomCommonBlocks ?? [];
        this.prevRoomDoorBlocks =
            prevRoomCommonBlocks.filter((b) => {
                return isIntesecting(b, prevRoom!.nextRoomTransitionRect);
            }) ?? [];
        assert(this.roomIndex === 0 || this.prevRoomDoorBlocks.length === 2);
    }

    // NOTE: This is only used as a temprorary replaced for the first room to not make it nullable.
    static temp(): Room {
        return new Room(new Vector2(0, 0), roomSizeInCells, [], null, Direction.NORTH, []);
    }

    get completed(): boolean {
        return this.started && this.wave.cleared;
    }

    shouldActivateNextRoom(player: Entity): boolean {
        if (!this.nextRoom || !this.nextRoomDoorOpen) return false;
        return isIntesecting(player, this.nextRoomTransitionRect);
    }

    update(manager: EntityManager): void {
        if (!this.started) {
            this.maybeStartRoom(manager.player);
        } else if (this.completed && !this.nextRoomDoorOpen) {
            if (this.nextRoom) {
                logger.debug(
                    '[Room] Room %i cleared. Opening door to room %i',
                    this.roomIndex,
                    this.nextRoom.roomIndex,
                );
                this.openNextRoomDoors();
            } else {
                logger.debug('[Room] Last room %i cleared.', this.roomIndex);
                // HACK: Last room doesn't have doors, we just mark to not flood with logs.
                this.nextRoomDoorOpen = true;
            }
        }
    }

    private maybeStartRoom(player: PlayerTank): void {
        assert(!this.started);
        if (!isIntesecting(player, this.boundary)) {
            return;
        }

        const isPlayerInsideDoors = this.prevRoomDoorBlocks.some((b) => isIntesecting(b, player));
        if (!isPlayerInsideDoors) {
            for (const b of this.prevRoomDoorBlocks) {
                b.dead = false;
            }
            this.started = true;
        }
    }

    private openNextRoomDoors(): void {
        const searchRect = this.nextRoomTransitionRect;
        // TODO: Instead of just removing the blocks, animate door opening.
        const block1 = this.blocks.find((b) => !b.dead && isIntesecting(b, searchRect));
        assert(block1 != null);
        block1.dead = true;
        const block2 = this.blocks.find((b) => !b.dead && isIntesecting(b, searchRect));
        assert(block2 != null);
        block2.dead = true;
        this.nextRoomDoorOpen = true;
    }

    private makeNextRoomTransitionRect(
        position: Vector2,
        sizeInCells: Vector2,
        nextDoorDir: Direction,
    ): Rect {
        let x = position.x;
        let y = position.y;
        const xOffset = (sizeInCells.width * CELL_SIZE) / 2;
        const yOffset = (sizeInCells.height * CELL_SIZE) / 2;
        const rectASize = CELL_SIZE; // NOTE: Longer side is positioned across the wall.
        const rectBSize = CELL_SIZE / 2;
        const rectOffset = rectBSize / 2;
        // NOTE: Rect should be positioned in the middle of the wall.
        switch (nextDoorDir) {
            case Direction.NORTH:
                return {
                    x: x - CELL_SIZE / 2,
                    // NOTE: Since position is the top-left corner, we need to subtract the size in north and west directions.
                    y: y - yOffset - rectBSize - rectOffset,
                    width: rectASize,
                    height: rectBSize,
                };
            case Direction.WEST:
                return {
                    x: x - xOffset - rectBSize - rectOffset,
                    y: y - CELL_SIZE / 2,
                    width: rectBSize,
                    height: rectASize,
                };
            case Direction.SOUTH:
                return {
                    x: x - CELL_SIZE / 2,
                    y: y + yOffset + rectOffset,
                    width: rectASize,
                    height: rectBSize,
                };
            case Direction.EAST:
                return {
                    x: x + xOffset + rectOffset,
                    y: y - CELL_SIZE / 2,
                    width: rectBSize,
                    height: rectASize,
                };
        }
    }
}
