import {Color} from '#/color';
import {GameInput} from '#/input';
import {isPosInsideRect} from '#/math';
import {MinPriorityQueue} from '#/math/priority-queue';
import {Vector2Like as V2, v2Equals, v2ManhattanDistance, v2Str} from '#/math/vector';
import {Renderer} from '#/renderer';
import {type GameState} from '#/state';

export interface AStarInput {
    start: V2;
    goal: V2;
    heuristic: (start: V2, goal: V2) => number;
    isGoalReached: (pos: V2, goal: V2) => boolean;
    getNeighbors: (pos: V2) => V2[];
}

interface AStarNode {
    pos: V2;
    /** The cost of the path from the start node to the current node (through its parent) */
    g: number;
    /** The heuristic cost of the current node to the end node */
    h: number;
    /** The sum of g and h */
    f: number;
    parent: AStarNode | null;
}

interface AStarContext extends AStarInput {
    openSet: MinPriorityQueue<AStarNode>;
    closedSet: Set<string>;
    bestGMap: Map<string, number>;
}

export function findAStarPath(input: AStarInput): V2[] | null {
    const a = getAStarContext(input);
    let current: AStarNode | null = null;
    while ((current = a.openSet.dequeue())) {
        if (a.isGoalReached(current.pos, a.goal)) {
            return collectPath(current);
        }
        processAStarNode(a, current);
    }
    return null;
}

function getAStarContext(input: AStarInput): AStarContext {
    const openSet = new MinPriorityQueue<AStarNode>((a, b) => {
        if (a.f === b.f) return a.h - b.h;
        return a.f - b.f;
    });
    const closedSet = new Set<string>();
    const bestGMap = new Map<string, number>();
    const a: AStarContext = {...input, openSet, closedSet, bestGMap};

    openSet.enqueue(newNode(a.start, null, 0, a.heuristic(a.start, a.goal)));
    bestGMap.set(v2Str(a.start), 0);
    return a;
}

function processAStarNode(a: AStarContext, current: AStarNode): void {
    const currentKey = v2Str(current.pos);
    if (a.closedSet.has(currentKey)) return;
    // Skip stale entries (there are better, already known entries)
    if (current.g > a.bestGMap.get(currentKey)!) return;
    a.closedSet.add(currentKey);

    const neighbors = a.getNeighbors(current.pos);
    for (const neighborPos of neighbors) {
        const neighborKey = v2Str(neighborPos);
        if (a.closedSet.has(neighborKey)) continue;

        const tentativeG = current.g + a.heuristic(current.pos, neighborPos);
        const bestG = a.bestGMap.get(neighborKey) ?? Infinity;
        if (tentativeG >= bestG) continue;

        const neighbor = newNode(
            neighborPos,
            current,
            tentativeG,
            a.heuristic(neighborPos, a.goal),
        );
        // NOTE: Re-enqueue even if neighbor is already in openSet to make sure we have the best path.
        a.openSet.enqueue(neighbor);
        a.bestGMap.set(neighborKey, tentativeG);
    }
}

function newNode(pos: V2, parent: AStarNode | null, g: number, h: number): AStarNode {
    return {
        pos: pos,
        g,
        h,
        f: g + h,
        parent,
    };
}

function collectPath(node: AStarNode): V2[] {
    const path: V2[] = [];
    let current: AStarNode | null = node;
    while (current) {
        path.push(current.pos);
        current = current.parent;
    }
    return path.reverse();
}

interface Cell {
    pos: V2;
    type: number;
}

export interface AStarInfo {
    cells: Cell[];
    ctx: AStarContext;
    pathInstant: V2[];
    path: V2[] | null;
}

const CELL_SIZE: V2 = {x: 1, y: 1};
const _ = 0;
const w = 1;
const S = 2;
const F = 3;

function collectNeighbors(pos: V2, cells: Cell[]): V2[] {
    const neighbors: V2[] = [];
    for (const c of cells) {
        if (c.type == w) continue;
        if (v2Equals(c.pos, pos)) continue;
        // Skip if not on the same row or column
        if (c.pos.x != pos.x && c.pos.y != pos.y) continue;
        const dx = Math.abs(c.pos.x - pos.x);
        const dy = Math.abs(c.pos.y - pos.y);
        if (dx == CELL_SIZE.x || dy == CELL_SIZE.y) {
            neighbors.push(c.pos);
        }
    }

    return neighbors;
}

const aStarSymbol = Symbol('aStar');
export function DEBUG_initAStar(state: GameState): void {
    (state as any)[aStarSymbol] = DEBUG_createAStarInfo();
}

function DEBUG_createAStarInfo(): AStarInfo {
    const map: number[][] = [
        [_, _, _, _, _, _, _, w, _, _, _, _, _, _, _, _],
        [_, _, w, w, w, _, _, w, _, _, _, _, _, S, _, _],
        [_, _, w, _, _, _, _, w, _, _, w, _, _, _, w, _],
        [_, _, w, _, _, w, w, w, _, _, w, w, w, w, w, _],
        [_, _, w, _, _, _, _, w, _, _, _, _, _, _, w, _],
        [_, _, w, w, w, _, _, w, w, _, _, _, _, _, w, w],
        [_, w, _, w, _, _, _, _, _, _, _, _, _, _, _, _],
        [_, w, w, w, _, _, w, w, w, w, w, w, w, w, w, _],
        [_, _, F, _, w, w, _, w, _, _, _, _, _, _, w, _],
        [_, w, w, _, _, _, _, w, _, _, _, w, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, w, _, _, _, _],
    ];
    const cells: Cell[] = [];
    const center: V2 = {x: 0, y: 0};
    const mapSize: V2 = {x: map[0]!.length, y: map.length};
    const topLeft: V2 = {x: center.x - mapSize.x / 2, y: center.y - mapSize.y / 2};
    for (const [y, row] of map.entries()) {
        for (const [x, cell] of row.entries()) {
            const pos: V2 = {
                x: topLeft.x + CELL_SIZE.x * x,
                y: topLeft.y + CELL_SIZE.y * y,
            };
            cells.push({pos, type: cell});
        }
    }

    const start = cells.find((cell) => cell.type === S)!;
    const goal = cells.find((cell) => cell.type === F)!;
    const input: AStarInput = {
        start: start.pos,
        goal: goal.pos,
        heuristic: v2ManhattanDistance,
        isGoalReached: v2Equals,
        getNeighbors: (pos) => collectNeighbors(pos, cells),
    };
    const a = getAStarContext(input);

    const path = findAStarPath(input);
    const info: AStarInfo = {
        cells: cells,
        path: null,
        pathInstant: path ?? [],
        ctx: a,
    };

    return info;
}

export function DEBUG_updateAStar(state: GameState, input: GameInput): void {
    if (input.isPressed('ArrowRight')) {
        const info: AStarInfo = (state as any)[aStarSymbol];
        const a = info.ctx;
        if (info.path?.length) {
            logger.info('Path is already found');
            return;
        }

        const current = a.openSet.dequeue();
        if (!current) {
            logger.info('No path found');
            return;
        }
        if (a.isGoalReached(current.pos, a.goal)) {
            info.path = collectPath(current);
        } else {
            processAStarNode(a, current);
        }
    }
    if (input.isPressed('KeyR')) {
        DEBUG_initAStar(state);
    }
}

export function DEBUG_drawAStar(r: Renderer, state: GameState, input: GameInput): void {
    const info: AStarInfo = (state as any)[aStarSymbol];
    const scale = 30;
    const margin = 5;
    const mouse = input.getMousePosition().clone();
    mouse.x = r.camera.toWorldX(mouse.x);
    mouse.y = r.camera.toWorldY(mouse.y);
    const closedSet = info.ctx.closedSet;
    r.setFont('16px Arial');

    r.fillScreen(Color.BLACK);
    for (const cell of info.cells) {
        if (cell.type === w) {
            r.setFillColor('#888888');
        } else if (cell.type === S) {
            r.setFillColor('#00ff00');
        } else if (cell.type === F) {
            r.setFillColor('#0000ff');
        } else {
            r.setFillColor('#161616');
        }
        r.fillRect(
            cell.pos.x * scale + margin,
            cell.pos.y * scale + margin,
            CELL_SIZE.x * scale - margin,
            CELL_SIZE.y * scale - margin,
        );
        if (closedSet.has(v2Str(cell.pos))) {
            const cx = cell.pos.x * scale + (CELL_SIZE.x / 2) * scale + margin / 2;
            const cy = cell.pos.y * scale + (CELL_SIZE.y / 2) * scale + margin / 2;
            r.setFillColor('#ffff00');
            r.fillCircle(cx, cy, (CELL_SIZE.x * scale) / 8);
        }
    }

    r.setStrokeColor('#ff7f00');
    for (let i = 0; i < info.pathInstant.length - 1; i++) {
        const p = info.pathInstant[i]!;
        const next = info.pathInstant[i + 1]!;

        const p1x = p.x * scale + (CELL_SIZE.x / 2) * scale + margin / 2;
        const p1y = p.y * scale + (CELL_SIZE.y / 2) * scale + margin / 2;

        const p2x = next.x * scale + (CELL_SIZE.x / 2) * scale + margin / 2;
        const p2y = next.y * scale + (CELL_SIZE.y / 2) * scale + margin / 2;

        r.strokeLine(p1x, p1y, p2x, p2y, 5);
    }

    if (info.path?.length) {
        for (let i = 0; i < info.path.length - 1; i++) {
            const curr = info.path[i]!;
            const next = info.path[i + 1]!;

            r.setStrokeColor('#00ffff');
            const p1x = curr.x * scale + (CELL_SIZE.x / 2) * scale + margin / 2;
            const p1y = curr.y * scale + (CELL_SIZE.y / 2) * scale + margin / 2;
            const p2x = next.x * scale + (CELL_SIZE.x / 2) * scale + margin / 2;
            const p2y = next.y * scale + (CELL_SIZE.y / 2) * scale + margin / 2;
            r.strokeLine(p1x, p1y, p2x, p2y, margin);
        }
    }

    for (const node of info.ctx.openSet) {
        const rect = {
            x: node.pos.x * scale + margin,
            y: node.pos.y * scale + margin,
            width: CELL_SIZE.x * scale - margin,
            height: CELL_SIZE.y * scale - margin,
        };
        if (isPosInsideRect(mouse.x, mouse.y, rect)) {
            r.setFillColor('#00ffff');
            r.fillText(`Open g=${node.g} h=${node.h} f=${node.f}`, {
                x: rect.x,
                y: rect.y - 15,
                shadowColor: Color.BLACK,
            });
            r.setFillColor('#ff0000');
        } else {
            r.setFillColor('#ff00ff');
        }
        const cx = node.pos.x * scale + (CELL_SIZE.x / 2) * scale + margin / 2;
        const cy = node.pos.y * scale + (CELL_SIZE.y / 2) * scale + margin / 2;
        r.fillCircle(cx, cy, (CELL_SIZE.x * scale) / 12);
    }

    /*
    for (const node of info.closedSet) {
        const rect = {
            x: node.pos.x * scale + margin,
            y: node.pos.y * scale + margin,
            width: cellSize.x * scale - margin,
            height: cellSize.y * scale - margin,
        };
        if (isPosInsideRect(mouse.x, mouse.y, rect)) {
            r.fillText(`Closed g=${node.g} h=${node.h} f=${node.f}`, {x: rect.x, y: rect.y - 15});
            r.setFillColor('#ff0000');
        } else {
            r.setFillColor('#ff00ff');
        }
        const cx = node.pos.x * scale + (cellSize.x / 2) * scale + margin / 2;
        const cy = node.pos.y * scale + (cellSize.y / 2) * scale + margin / 2;
        r.fillCircle(cx, cy, (cellSize.x * scale) / 10);
    }
    */

    r.setFillColor('#00ffff');
    r.fillCircle(mouse.x, mouse.y, (CELL_SIZE.x * scale) / 8);
}
