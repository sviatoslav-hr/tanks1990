import { CELL_SIZE } from '#/const';
import { Entity } from '#/entity/core';
import { EntityManager } from '#/entity/manager';
import { Rect, isPosInsideRect } from '#/math';
import { MinPriorityQueue } from '#/math/priority-queue';
import { Vector2, Vector2Like } from '#/math/vector';
import { isRectOccupied } from '#/world';

type Node = {
    pos: Vector2;
    parent: Node | null;
    /** The cost of the path from the start node to the current node (through its parent) */
    g: number;
    /** The heuristic cost of the current node to the end node */
    h: number;
    /** The sum of g and h */
    f: number;
};

export function findPath(
    source: Entity,
    target: Rect,
    manager: EntityManager,
    maxSteps: number,
    posOffset: number = (CELL_SIZE * 0.8) / 5,
    debug = false,
): Vector2[] | null {
    const start = Vector2.from(source)
        .addXY(source.width / 2, source.height / 2)
        .round();
    const end = Vector2.from(target)
        .addXY(target.width / 2, target.height / 2)
        .round();

    const openSet = new MinPriorityQueue<Node>((a, b) => {
        if (a.f === b.f) return a.h - b.h;
        return a.f - b.f;
    });
    const openSetByKeys = new Map<string, Node>();
    const gScores = new Map<string, number>();
    const fScores = new Map<string, number>();
    const closedSet = new Set<string>();

    const startNode = createNode(start, null, start, end);
    openSet.enqueue(startNode);
    gScores.set(start.toString(), 0);
    fScores.set(start.toString(), startNode.f);
    openSetByKeys.set(start.toString(), startNode);

    for (let step = 0; step < maxSteps; step++) {
        if (openSet.length === 0) {
            if (debug) logger.debug('Open set exhausted, path not found.');
            break;
        }

        const current = openSet.dequeue()!;
        const currentKey = current.pos.toString();
        openSetByKeys.delete(currentKey);

        if (isPosInsideRect(current.pos.x, current.pos.y, target)) {
            if (debug) logger.debug(`Path found in ${step} steps.`);
            const path = reconstructPath(current);
            return simplifyPath(path);
        }

        closedSet.add(currentKey);

        for (let neighbor of getValidNeighbors(current, end, manager, source, posOffset)) {
            const neighborKey = neighbor.pos.toString();
            if (closedSet.has(neighborKey)) continue;
            const neighborFromSet = openSetByKeys.get(neighborKey);
            if (neighborFromSet) {
                neighbor = neighborFromSet;
            }

            const tentativeG = current.g + current.pos.manhattanDistanceTo(neighbor.pos);
            if (tentativeG < (gScores.get(neighborKey) ?? Infinity)) {
                neighbor.g = tentativeG;
                neighbor.f = tentativeG + neighbor.h;
                neighbor.parent = current;

                gScores.set(neighborKey, tentativeG);
                fScores.set(neighborKey, neighbor.f);

                if (!neighborFromSet) {
                    openSet.enqueue(neighbor);
                    openSetByKeys.set(neighborKey, neighbor);
                }
            }
        }
    }

    if (debug) logger.warn('No path found after max steps.');
    return null;
}

function simplifyPath(path: Vector2[]): Vector2[] {
    if (path.length < 3) return path;
    const simplified: Vector2[] = [path[0]!];
    let prevDirection = path[1]!.clone().sub(path[0]!);
    for (let i = 2; i < path.length; i++) {
        const currDirection = path[i]!.clone().sub(path[i - 1]!);
        if (!currDirection.equals(prevDirection)) {
            simplified.push(path[i - 1]!);
        }
        prevDirection = currDirection;
    }
    simplified.push(path[path.length - 1]!);
    return simplified;
}

function reconstructPath(node: Node): Vector2[] {
    const path: Vector2[] = [];
    let current: Node | null = node;
    while (current) {
        // NOTE: Do not include the start node in the path
        if (current.parent) {
            path.push(current.pos);
        }
        current = current.parent;
    }
    return path.reverse();
}

function getValidNeighbors(
    node: Node,
    end: Vector2,
    manager: EntityManager,
    source: Entity,
    posOffset: number,
): Node[] {
    const neighbors: Node[] = [];
    const directions: Vector2Like[] = [
        {x: 0, y: -posOffset},
        {x: posOffset, y: 0},
        {x: 0, y: posOffset},
        {x: -posOffset, y: 0},
    ];

    for (const dir of directions) {
        const pos = node.pos.clone().add(dir).round();
        const rect: Rect = {
            x: pos.x - source.width / 2,
            y: pos.y - source.height / 2,
            width: source.width,
            height: source.height,
        };
        if (!isRectOccupied(rect, manager, source)) {
            const h = pos.manhattanDistanceTo(end);
            neighbors.push({
                pos,
                parent: node,
                g: Infinity,
                h,
                f: Infinity,
            });
        }
    }

    return neighbors;
}

function createNode(pos: Vector2, parent: Node | null, start: Vector2, end: Vector2): Node {
    const stepCost = pos.manhattanDistanceTo(parent?.pos ?? start);
    const g = stepCost + (parent?.g ?? 0);
    const h = pos.manhattanDistanceTo(end);
    const f = g + h;
    return {pos, g, h, f, parent};
}
