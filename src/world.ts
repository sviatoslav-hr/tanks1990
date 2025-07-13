import {Color} from '#/color';
import {GameConfig} from '#/config';
import {CELL_SIZE} from '#/const';
import {PlayerTank} from '#/entity';
import {Block, generateBlocks} from '#/entity/block';
import {Entity, isIntesecting, isSameEntity} from '#/entity/core';
import {EnemyWave, wavePerRoom} from '#/entity/enemy-wave';
import {EntityManager} from '#/entity/manager';
import {Rect, fmod, isPosInsideRect, oppositeDirection} from '#/math';
import {Direction} from '#/math/direction';
import {random} from '#/math/rng';
import {Vector2, Vector2Like} from '#/math/vector';
import {Renderer} from '#/renderer';
import {createStaticSprite} from '#/renderer/sprite';

export const roomSizeInCells = new Vector2(12, 8);

export class World {
    roomsLimit = MAX_ROOMS_COUNT;
    readonly startRoomPosition = new Vector2(0, 0);
    activeRoom = new Room(this.startRoomPosition, roomSizeInCells, [], null, Direction.NORTH, []);
    activeRoomInFocus = false;
    rooms: Room[] = [this.activeRoom];
    readonly bgColor = Color.BLACK_RAISIN;
    readonly gridColor = Color.BLACK_IERIE;
    readonly boundaryColor = Color.BLACK_IERIE;
    readonly boundaryThickness = 0.1 * CELL_SIZE;

    init(manager: EntityManager): void {
        this.rooms = generateDungeon(this.startRoomPosition, manager, this.roomsLimit);
        const startRoom = this.rooms[0];
        assert(startRoom);
        this.activeRoom = startRoom;
    }

    update(manager: EntityManager): void {
        this.activeRoom.update(manager);
    }

    drawRooms(renderer: Renderer, config: GameConfig): void {
        for (const b of this.iterateBlocks()) {
            b.draw(renderer);
        }
        if (config.debugShowBoundaries) {
            this.drawWorldBoundary(renderer);
            this.activeRoom.drawBoundary(renderer);
        }
    }

    *iterateBlocks(): Generator<Block> {
        for (const room of this.rooms) {
            for (const block of room.blocks) {
                yield block;
            }
        }
    }

    drawTiles(renderer: Renderer, cellSize: number = CELL_SIZE): void {
        if (true) {
            this.drawGrid(renderer, cellSize);
            this.activeRoom.drawRoomNumber(renderer);
            return;
        }
        // TODO: Figure out a performance way to deal with tiles.
        //       And also pick the tiles that actually looks nice.
        // const camera = renderer.camera;
        // cellSize *= camera.scale;
        // NOTE: Find top-left position of the camera in camera coordinates
        // const cameraX0 = camera.worldOffset.x * camera.scale - camera.screenSize.width / 2;
        // const cameraY0 = camera.worldOffset.y * camera.scale - camera.screenSize.height / 2;
        // NOTE: Find first visible line on the screen for each axis
        // const x0 = cellSize - fmod(cameraX0, cellSize) - cellSize;
        // const y0 = cellSize - fmod(cameraY0, cellSize) - cellSize;

        // renderer.useCameraCoords(true);
        // const maxX = x0 + camera.screenSize.width + cellSize;
        // const maxY = y0 + camera.screenSize.height + cellSize;
        // NOTE: Should be converted to world coordinates since sprite converts them back
        // const worldSize = cellSize * camera.scale;
        // for (let colX = x0; colX < maxX; colX += cellSize) {
        // for (let colY = y0; colY < maxY; colY += cellSize) {
        // this.tileSprite.draw(renderer, {
        //     x: camera.toWorldX(colX),
        //     y: camera.toWorldY(colY),
        //     width: worldSize,
        //     height: worldSize,
        // });
        // }
        // }
        // renderer.useCameraCoords(false);
    }

    private drawGrid(renderer: Renderer, cellSize: number): void {
        const camera = renderer.camera;
        cellSize *= camera.scale;
        // NOTE: Find top-left position of the camera in camera coordinates
        const cameraX0 = camera.worldOffset.x * camera.scale - camera.screenSize.width / 2;
        const cameraY0 = camera.worldOffset.y * camera.scale - camera.screenSize.height / 2;
        // NOTE: Find first visible line on the screen for each axis
        const x0 = cellSize - fmod(cameraX0, cellSize);
        const y0 = cellSize - fmod(cameraY0, cellSize);

        renderer.setStrokeColor(this.gridColor);
        renderer.useCameraCoords(true);
        const offset = 1;
        const maxX = x0 + camera.screenSize.width + cellSize;
        for (let colX = x0; colX < maxX; colX += cellSize) {
            const x1 = colX + offset;
            const y1 = offset - cellSize;
            const x2 = x1;
            const y2 = camera.screenSize.height + offset + cellSize;
            renderer.strokeLine(x1, y1, x2, y2);
        }
        const maxY = y0 + camera.screenSize.height + cellSize;
        for (let colY = y0; colY < maxY; colY += cellSize) {
            const x1 = offset - cellSize;
            const x2 = camera.screenSize.width + offset + cellSize;
            const y1 = colY + offset;
            const y2 = y1;
            renderer.strokeLine(x1, y1, x2, y2);
        }
        renderer.useCameraCoords(false);
    }

    private drawWorldBoundary(renderer: Renderer): void {
        for (const room of this.rooms) {
            renderer.setStrokeColor(Color.RED);
            renderer.strokeBoundary(room.boundary);
        }
    }

    reset(): void {
        this.activeRoom = this.rooms[0] ?? this.activeRoom;
        this.activeRoom.reset();
        this.activeRoomInFocus = false;
        this.rooms = [this.activeRoom];
    }
}

export function isOccupied(
    pos: Vector2Like,
    manager: EntityManager,
    ignoredEntity?: Entity,
): boolean {
    for (const entity of manager.iterateCollidable()) {
        if (entity === manager.player) continue;
        if (ignoredEntity && isSameEntity(entity, ignoredEntity)) continue;
        if (isPosInsideRect(pos.x, pos.y, entity)) {
            return true;
        }
    }
    return false;
}

export function isRectOccupied(
    rect: Rect,
    entityManager: EntityManager,
    ignoreEntity?: Entity,
): boolean {
    for (const entity of entityManager.iterateCollidable()) {
        if (isSameEntity(entity, entityManager.player)) continue;
        if (ignoreEntity && isSameEntity(entity, ignoreEntity)) continue;
        if (isIntesecting(rect, entity)) {
            return true;
        }
    }
    return false;
}

// TODO: Figure out generation algorithm that would avoid overlapping rooms
function generateDungeon(
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

export const MAX_ROOMS_COUNT = wavePerRoom.length;

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
            const wave = wavePerRoom[this.roomIndex];
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

    get completed(): boolean {
        return this.started && this.wave.cleared;
    }

    shouldActivateNextRoom(player: Entity): boolean {
        if (!this.nextRoom || !this.nextRoomDoorOpen) return false;
        return isIntesecting(player, this.nextRoomTransitionRect);
    }

    drawRoomNumber(renderer: Renderer): void {
        const text = `${this.roomIndex + 1}`;
        const scale = renderer.camera.scale;
        const fontSize = CELL_SIZE * 8 * scale;
        renderer.setFont(`700 ${fontSize}px Arial`, 'center', 'middle');
        const metrics = renderer.measureText(text);
        let {x, y} = this.position;
        // NOTE: Offset the text since baseline=middle does not put the character actually in the middle.
        y += (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2 / scale;
        renderer.setGlobalAlpha(0.05);
        renderer.fillText(text, {x, y, color: '#ffffff'});
        renderer.setGlobalAlpha(1);
    }

    // TODO: Move block rendering from world into room for both modes.
    drawBoundary(renderer: Renderer): void {
        renderer.setStrokeColor('blue');
        renderer.strokeBoundary(this.nextRoomTransitionRect, 10);

        renderer.setStrokeColor(this.boundaryColor);
        const boundaryThickness = 0.05 * CELL_SIZE;
        const boundary = this.boundary;
        renderer.strokeBoundary(
            {
                x: boundary.x - 0.5 * boundaryThickness,
                y: boundary.y - 0.5 * boundaryThickness,
                width: boundary.width + boundaryThickness,
                height: boundary.height + boundaryThickness,
            },
            boundaryThickness,
        );
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

    reset(): void {
        this.blocks = [];
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
