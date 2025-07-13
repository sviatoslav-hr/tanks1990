import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {fmod} from '#/math';
import {Renderer} from '#/renderer';
import {Room} from '#/world/room';
import {World} from '#/world/world';

export function drawWorldBlocks(renderer: Renderer, world: World): void {
    for (const b of world.iterateBlocks()) {
        b.draw(renderer);
    }
}
export function drawWorldBackground(renderer: Renderer, world: World): void {
    renderer.setFillColor(world.bgColor);
    renderer.fillScreen();
    if (true) {
        drawWorldGrid(renderer, world.gridColor);
        drawRoomNumber(renderer, world.activeRoom);
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

function drawWorldGrid(renderer: Renderer, gridColor: string): void {
    let cellSize = CELL_SIZE;
    const camera = renderer.camera;
    cellSize *= camera.scale;
    // NOTE: Find top-left position of the camera in camera coordinates
    const cameraX0 = camera.worldOffset.x * camera.scale - camera.screenSize.width / 2;
    const cameraY0 = camera.worldOffset.y * camera.scale - camera.screenSize.height / 2;
    // NOTE: Find first visible line on the screen for each axis
    const x0 = cellSize - fmod(cameraX0, cellSize);
    const y0 = cellSize - fmod(cameraY0, cellSize);

    renderer.setStrokeColor(gridColor);
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

function drawRoomNumber(renderer: Renderer, room: Room): void {
    const text = `${room.roomIndex + 1}`;
    const scale = renderer.camera.scale;
    const fontSize = CELL_SIZE * 8 * scale;
    renderer.setFont(`700 ${fontSize}px Arial`, 'center', 'middle');
    const metrics = renderer.measureText(text);
    let {x, y} = room.position;
    // NOTE: Offset the text since baseline=middle does not put the character actually in the middle.
    y += (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2 / scale;
    renderer.setGlobalAlpha(0.05);
    renderer.fillText(text, {x, y, color: '#ffffff'});
    renderer.setGlobalAlpha(1);
}

function drawRoomDebugBoundaries(renderer: Renderer, rooms: Room[]): void {
    for (const room of rooms) {
        renderer.setStrokeColor(Color.RED);
        renderer.strokeBoundary(room.boundary);
    }
}

export function drawWorldDebugUI(renderer: Renderer, world: World): void {
    drawRoomDebugBoundaries(renderer, world.rooms);
    drawRoomDebugUI(renderer, world.activeRoom);
}

// TODO: Move block rendering from world into room for both modes.
function drawRoomDebugUI(renderer: Renderer, room: Room): void {
    renderer.setStrokeColor('blue');
    renderer.strokeBoundary(room.nextRoomTransitionRect, 10);

    renderer.setStrokeColor(room.boundaryColor);
    const boundaryThickness = 0.05 * CELL_SIZE;
    const boundary = room.boundary;
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
