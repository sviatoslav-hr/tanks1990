import {Color} from '#/color';
import {BASE_HEIGHT, BASE_WIDTH, CELL_SIZE} from '#/const';
import {Block, generateBlocks} from '#/entity/block';
import {Direction, Entity, isIntesecting} from '#/entity/core';
import {EntityManager, isSameEntity} from '#/entity/manager';
import {createStaticSprite, createTileSprite} from '#/entity/sprite';
import {JSONObjectParser} from '#/json';
import {Rect, fmod, isPosInsideRect, oppositeDirection, randomFrom} from '#/math';
import {Vector2, Vector2Like} from '#/math/vector';
import {Renderer} from '#/renderer';
import {GameStorage} from '#/storage';

const WORLD_CONFIG_KEY = 'world_config';

export class World {
    showBoundary = false;
    roomsLimit = 18;
    readonly roomSizeInCells = new Vector2(16, 10);
    readonly startRoomPosition = new Vector2(0, 0);
    readonly boundary: Rect = {
        x: -BASE_WIDTH / 2,
        y: -BASE_HEIGHT / 2,
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
    };
    activeRoom = new Room(this.startRoomPosition, this.roomSizeInCells, []);
    rooms: Room[] = [this.activeRoom];
    #valuesDirty = false; // NOTE: Used to mark for saving
    private tileSprite = createTileSprite();
    readonly bgColor = Color.BLACK_RAISIN;
    readonly gridColor = Color.BLACK_IERIE;
    readonly boundaryColor = Color.BLACK_IERIE;
    readonly boundaryThickness = 0.1 * CELL_SIZE;

    get needsSaving(): boolean {
        return this.#valuesDirty;
    }

    init(manager: EntityManager): void {
        this.rooms = generateDungeon(
            this.startRoomPosition,
            this.roomSizeInCells,
            manager,
            this.roomsLimit,
        );
        const startRoom = this.rooms[0];
        assert(startRoom);
        this.activeRoom = startRoom;
        this.markDirty();
    }

    update(): void {
        this.activeRoom.update();
    }

    draw(renderer: Renderer): void {
        if (false) this.drawTiles(renderer, CELL_SIZE);
        else this.drawGrid(renderer, CELL_SIZE);
        this.drawWorldBoundary(renderer);
        this.activeRoom.draw(renderer, this);
        for (const b of this.iterateBlocks()) {
            b.draw(renderer);
        }
    }

    *iterateBlocks(): Generator<Block> {
        for (const room of this.rooms) {
            for (const block of room.blocks) {
                yield block;
            }
        }
    }

    private drawTiles(renderer: Renderer, cellSize: number): void {
        const camera = renderer.camera;
        cellSize *= camera.scale;
        // NOTE: Find top-left position of the camera in camera coordinates
        const cameraX0 = camera.worldOffset.x * camera.scale - camera.screenSize.width / 2;
        const cameraY0 = camera.worldOffset.y * camera.scale - camera.screenSize.height / 2;
        // NOTE: Find first visible line on the screen for each axis
        const x0 = cellSize - fmod(cameraX0, cellSize) - cellSize;
        const y0 = cellSize - fmod(cameraY0, cellSize) - cellSize;

        renderer.useCameraCoords(true);
        const maxX = x0 + camera.screenSize.width + cellSize;
        const maxY = y0 + camera.screenSize.height + cellSize;
        // NOTE: Should be converted to world coordinates since sprite converts them back
        const worldSize = cellSize * camera.scale;
        for (let colX = x0; colX < maxX; colX += cellSize) {
            for (let colY = y0; colY < maxY; colY += cellSize) {
                this.tileSprite.draw(renderer, {
                    x: camera.toWorldX(colX),
                    y: camera.toWorldY(colY),
                    width: worldSize,
                    height: worldSize,
                });
            }
        }
        renderer.useCameraCoords(false);
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
        if (this.showBoundary) {
            for (const room of this.rooms) {
                renderer.setStrokeColor(Color.RED);
                renderer.strokeBoundary(room.boundary);
            }
        }
    }

    markDirty(): void {
        this.#valuesDirty = true;
    }

    save(storage: GameStorage): void {
        assert(this.#valuesDirty);
        storage.set(WORLD_CONFIG_KEY, this.serialize());
        this.#valuesDirty = false;
    }

    serialize(): string {
        return JSON.stringify({
            b: this.showBoundary,
            bx: this.boundary.x,
            by: this.boundary.y,
            bw: this.boundary.width,
            bh: this.boundary.height,
        });
    }

    load(storage: GameStorage): void {
        const data = storage.get(WORLD_CONFIG_KEY);
        if (data) {
            this.deserialize(data);
            this.#valuesDirty = false;
        }
    }

    deserialize(data: string): void {
        const parser = new JSONObjectParser(data);
        this.showBoundary = parser.getBoolean('b') ?? false;
        const bx = parser.getNumber('bx');
        const by = parser.getNumber('by');
        const bw = parser.getNumber('bw');
        const bh = parser.getNumber('bh');
        if (bh != null && bw != null && bx != null && by != null) {
            this.boundary.x = bx;
            this.boundary.y = by;
            this.boundary.width = bw;
            this.boundary.height = bh;
        }
    }

    reset(): void {
        this.activeRoom = this.rooms[0] ?? this.activeRoom;
        this.activeRoom.reset();
        this.rooms = [this.activeRoom];
    }
}

export function isOccupied(pos: Vector2Like, entityManager: EntityManager): boolean {
    for (const entity of entityManager.iterateEntities()) {
        if (entity === entityManager.player) continue;
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
    roomSizeInCells: Vector2,
    manager: EntityManager,
    roomsLimit = 6,
): Room[] {
    const rooms: Room[] = [];
    const roomPosition = startRoomPosition.clone();
    for (let i = 0; i < roomsLimit; i++) {
        const prevRoom = rooms[i - 1];
        if (prevRoom) {
            roomPosition.setFrom(prevRoom.position);
            switch (prevRoom.nextDoorDir) {
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
    const blocks: Block[] = [];
    const cellSize = CELL_SIZE;

    const minX = roomPosition.x - (sizeInCells.width / 2) * cellSize;
    const sprite = createStaticSprite({
        key: 'bricks',
        frameWidth: 64,
        frameHeight: 64,
    });
    const prevDir = prevRoom?.nextDoorDir != null && oppositeDirection(prevRoom.nextDoorDir);

    // north and south walls
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
        }
    }

    const room = new Room(roomPosition, sizeInCells, blocks, prevRoom);
    const insideBlocks = generateBlocks(manager, room.boundary, 20, manager.player);
    room.blocks.push(...insideBlocks);

    return room;
}

export class Room {
    aliveEnemiesCount = 0;
    started = false;
    nextDoorOpen = false;
    readonly boundaryColor = Color.RED;
    readonly boundary: Rect;
    readonly nextDoorDir: Direction;
    nextRoom: Room | null = null;
    nextRoomRect: Rect;
    roomIndex = 0;

    constructor(
        public position: Vector2,
        public sizeInCells: Vector2,
        public blocks: Block[],
        public prevRoom: Room | null = null,
    ) {
        this.boundary = {
            x: this.position.x - 0.5 * CELL_SIZE * this.sizeInCells.width,
            y: this.position.y - 0.5 * CELL_SIZE * this.sizeInCells.height,
            width: CELL_SIZE * this.sizeInCells.width,
            height: CELL_SIZE * this.sizeInCells.height,
        };
        const dirs = [Direction.NORTH, Direction.EAST, /*Direction.SOUTH,*/ Direction.WEST];
        if (prevRoom) {
            dirs.splice(dirs.indexOf(oppositeDirection(prevRoom.nextDoorDir)), 1);
            prevRoom.nextRoom = this;
        }
        this.nextDoorDir = randomFrom(...dirs);
        this.nextRoomRect = this.getNextRoomRect(position, sizeInCells, this.nextDoorDir);
        this.roomIndex = prevRoom ? prevRoom.roomIndex + 1 : 0;
    }

    shouldGoToNextRoom(player: Entity): boolean {
        if (!this.nextRoom || !this.nextDoorOpen) return false;
        if (isIntesecting(player, this.nextRoomRect)) {
            return true;
        }
        return false;
    }

    // TODO: Move block rendering from world into room for both modes.
    draw(renderer: Renderer, world: World): void {
        {
            let text = `${this.roomIndex + 1}`;
            const fontSize = CELL_SIZE * 8 * renderer.camera.scale;
            renderer.setFont(`700 ${fontSize}px Helvetica`, 'center', 'middle');
            const {x, y} = this.position;
            renderer.setGlobalAlpha(0.05);
            renderer.fillText(text, {x, y, color: '#ffffff'});
            renderer.setGlobalAlpha(1);
        }
        if (!world.showBoundary) {
            return;
        }

        renderer.setStrokeColor('blue');
        renderer.strokeBoundary(this.nextRoomRect, 10);

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

    update(): void {
        if (!this.nextRoom) return;
        if (!this.started && this.aliveEnemiesCount > 0) {
            console.log(`Room ${this.roomIndex} started`);
            this.started = true;
        }
        if (this.started && this.aliveEnemiesCount === 0 && !this.nextDoorOpen) {
            console.log(`Room ${this.roomIndex} cleared`);
            this.removeNextDoorBlocks();
            this.nextDoorOpen = true;
        }
    }

    reset(): void {
        this.blocks = [];
    }

    private removeNextDoorBlocks(): void {
        const doorPos = this.position.clone();
        switch (this.nextDoorDir) {
            case Direction.NORTH:
                doorPos.y -= (this.sizeInCells.height * CELL_SIZE) / 2;
                break;
            case Direction.EAST:
                doorPos.x += (this.sizeInCells.width * CELL_SIZE) / 2;
                break;
            case Direction.SOUTH:
                doorPos.y += (this.sizeInCells.height * CELL_SIZE) / 2;
                break;
            case Direction.WEST:
                doorPos.x -= (this.sizeInCells.width * CELL_SIZE) / 2;
                break;
        }
        const searchRect: Rect = {
            x: doorPos.x - CELL_SIZE / 2,
            y: doorPos.y - CELL_SIZE / 2,
            width: CELL_SIZE,
            height: CELL_SIZE,
        };
        const block1 = this.blocks.findIndex((b) => isIntesecting(b, searchRect));
        assert(block1 > -1);
        this.blocks.splice(block1, 1);
        const block2 = this.blocks.findIndex((b) => isIntesecting(b, searchRect));
        assert(block2 > -1);
        this.blocks.splice(block2, 1);
    }

    private getNextRoomRect(position: Vector2, sizeInCells: Vector2, nextDoorDir: Direction): Rect {
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
