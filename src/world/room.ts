import {CELL_SIZE} from '#/const';
import {PlayerTank} from '#/entity';
import {Block} from '#/entity/block';
import {Entity, isIntesecting} from '#/entity/core';
import {EnemyWave, wavesPerRoom} from '#/entity/enemy-wave';
import {EntityManager} from '#/entity/manager';
import {Pickup} from '#/entity/pickup';
import {Rect} from '#/math';
import {Direction, getDirectionBetween} from '#/math/direction';
import {Vector2} from '#/math/vector';
import {WorldNode} from './graph';

export const roomSizeInCells = new Vector2(12, 8);

// TODO: Room code needs to be refactored, it's too complex, intermingled and messy #roomgen
export class Room {
    started = false;
    readonly boundary: Rect;
    readonly nextRoomTransitionRects: Rect[];
    nextRooms: Room[] = [];
    nextRoomDoorOpen = false;
    prevRoomDoorBlocks: Block[];
    depth: number;
    wave: EnemyWave;
    pickups: Pickup[] = [];

    constructor(
        public node: WorldNode,
        public position: Vector2,
        public sizeInCells: Vector2,
        public blocks: Block[],
        public prevRooms: Room[],
        public nextRoomDirs: Direction[],
        public readonly nextRoomCommonBlocks: Block[],
    ) {
        this.boundary = {
            x: this.position.x - 0.5 * CELL_SIZE * this.sizeInCells.width,
            y: this.position.y - 0.5 * CELL_SIZE * this.sizeInCells.height,
            width: CELL_SIZE * this.sizeInCells.width,
            height: CELL_SIZE * this.sizeInCells.height,
        };
        for (const p of prevRooms) {
            p.nextRooms.push(this);
        }
        this.nextRoomTransitionRects = this.nextRoomDirs.map((nextDir) =>
            this.makeNextRoomTransitionRect(position, sizeInCells, nextDir),
        );
        this.depth = node.depth;
        {
            const wave = wavesPerRoom[this.depth - 1];
            assert(wave);
            // TODO: Clone the wave, just in case. But currently, there shouldn't be any problems with it.
            wave.reset();
            this.wave = wave;
        }
        // const prevRoomCommonBlocks = prevRooms.flatMap((p) => p.nextRoomCommonBlocks.slice());
        // this.prevRoomDoorBlocks = prevRoomCommonBlocks.filter((block) => {
        //     prevRooms.some((p) => p.nextRoomTransitionRects.some((r) => isIntesecting(block, r)));
        // });
        // TODO: For some reason, previous code doesn't work, but this does...
        // PERF: Also, this is not optimal - too much looping.
        this.prevRoomDoorBlocks = prevRooms.flatMap((p) =>
            p.nextRoomCommonBlocks.filter((b) =>
                p.nextRoomTransitionRects.some((r) => isIntesecting(b, r)),
            ),
        );
        assert(this.depth === 1 || this.prevRoomDoorBlocks.length >= 2);
    }

    // NOTE: This is only used as a temprorary replaced for the first room to not make it nullable.
    static temp(): Room {
        const zero: WorldNode = {x: 0, y: 0, depth: 1, connectedNodes: {}};
        return new Room(zero, new Vector2(0, 0), roomSizeInCells, [], [], [Direction.NORTH], []);
    }

    get completed(): boolean {
        return this.started && this.wave.cleared;
    }

    shouldActivateNextRoom(player: Entity): Room | null {
        if (!this.nextRooms.length || !this.nextRoomDoorOpen) return null;
        const rectIndex = this.nextRoomTransitionRects.findIndex((r) => isIntesecting(player, r));
        if (rectIndex === -1) return null;
        const nextDirection = this.nextRoomDirs[rectIndex];
        assert(nextDirection);
        const nextRoom = this.nextRooms.find(
            (r) => getDirectionBetween(this.node, r.node) === nextDirection,
        );
        assert(nextRoom);
        return nextRoom;
    }

    update(manager: EntityManager): void {
        if (!this.started) {
            this.maybeStartRoom(manager.player);
        } else if (this.completed && !this.nextRoomDoorOpen) {
            if (this.nextRooms.length) {
                logger.debug(
                    '[Room] Room %i cleared. Opening door to room %i',
                    this.depth,
                    this.depth + 1,
                );
                this.openNextRoomDoors();
            } else {
                logger.debug('[Room] Last room %i cleared.', this.depth);
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
        for (const searchRect of this.nextRoomTransitionRects) {
            // TODO: Instead of just removing the blocks, animate door opening.
            const block1 = this.blocks.find((b) => !b.dead && isIntesecting(b, searchRect));
            assert(block1 != null);
            block1.dead = true;
            const block2 = this.blocks.find((b) => !b.dead && isIntesecting(b, searchRect));
            assert(block2 != null);
            block2.dead = true;
        }
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
