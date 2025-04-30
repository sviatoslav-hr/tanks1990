import {Rect, isPosInsideRect, numround} from '#/math';
import {Vector2} from '#/math/vector';
import {isRectOccupied} from '#/world';
import {EntityManager} from '#/entity/manager';
import {Entity} from '#/entity/core';

type Node = {
    id: number;
    pos: Vector2;
    considered: boolean;
    parent: Node | null;
    /** The cost of the path from the start node to the current node */
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
    debug = false,
): Vector2[] | null {
    const startP = Vector2.from(source);
    startP.x += source.width / 2;
    startP.y += source.height / 2;
    startP.round();
    const endP = Vector2.from(target);
    endP.x += target.width / 2;
    endP.y += target.height / 2;
    endP.round();
    const allNodes = new Array<Node>();

    let currentNode: Node | null = null;
    let lastClosestNode: Node | null = null;
    for (let step = 0; step < maxSteps; step++) {
        currentNode = allNodes.length > 0 ? getClosestNode(allNodes) : null;
        if (allNodes.length && !currentNode) {
            debug && console.log('No closest node found, all nodes considered');
            break;
        }
        if (currentNode) {
            currentNode.considered = true;
            lastClosestNode = currentNode;
        }
        if (currentNode && isPosInsideRect(currentNode.pos.x, currentNode.pos.y, target)) {
            debug && console.log(`Found path in ${step} steps for node ${currentNode.pos}`);
            lastClosestNode = currentNode;
            break;
        }
        // TODO: Some of the surrounding nodes should recompute the path since there might be a better path
        // PERF: This could be optimized. *What kind of optimization specifically?*
        appendSurrondingNodes(
            currentNode?.pos ?? startP,
            currentNode,
            endP,
            allNodes,
            manager,
            source,
            debug,
        );
        if (!allNodes.length) {
            // NOTE: No path found, entity is blocked/stuck
            return null;
        }
    }
    assert(lastClosestNode !== null);
    const path = createPath(lastClosestNode);
    debug &&
        console.log(
            `For Source=${source.id} Found path with length ${path.length} at position ${source.x}, ${source.y}`,
        );
    return path;
}

function posRoundEqual(a: Vector2, b: Vector2): boolean {
    const ax = numround(a.x);
    const ay = numround(a.y);
    const bx = numround(b.x);
    const by = numround(b.y);
    return ax === bx && ay === by;
}

function appendSurrondingNodes(
    pos: Vector2,
    parent: Node | null,
    end: Vector2,
    nodes: Node[],
    manager: EntityManager,
    source: Entity,
    debug = false,
): void {
    // PERF: This could be optimized. *What kind of optimization specifically?*
    const neighbors = makeNodeNeighbors(pos, parent, end, manager, source);
    const filteredNeighbors = neighbors.filter((n) => {
        return !nodes.some((node) => posRoundEqual(node.pos, n.pos));
        // return !nodes.some((node) => node.pos.equals(n.pos));
    });
    // TODO: Can this happen so that there are no neighbors?
    // assert(filteredNeighbors.length > 0);
    nodes.push(...filteredNeighbors);
    debug &&
        console.log(
            `Got ${filteredNeighbors.length} valid neighbors for node ${parent?.id ?? 'initial'}/${parent?.pos ?? pos}. Overall ${nodes.length} nodes`,
        );
}

let lastId = 0;
function createNode(pos: Vector2, parent: Node | null, start: Vector2, end: Vector2): Node {
    // Technically this should be the cost of the path, not the distance between the points
    const g = pos.manhattanDistanceTo(start);
    const h = pos.manhattanDistanceTo(end);
    const f = g + h;
    return {id: lastId++, pos, g, h, f, considered: false, parent: parent};
}

function getClosestNode(nodes: Node[]): Node | null {
    let closest: Node | undefined;
    for (const node of nodes) {
        if (node.considered) {
            continue;
        }
        if (!closest || node.f < closest.f) {
            closest = node;
        }
    }
    if (closest?.considered) {
        return null;
    }
    return closest ?? null;
}

function makeNodeNeighbors(
    pos: Vector2,
    parent: Node | null,
    end: Vector2,
    manager: EntityManager,
    source: Entity,
): Node[] {
    const neighbors = new Array<Node>();
    const offsetX = source.width / 4;
    const offsetY = source.height / 4;
    const allDirections = [
        new Vector2(0, -offsetY),
        new Vector2(offsetX, 0),
        new Vector2(0, offsetY),
        new Vector2(-offsetX, 0),
    ];
    for (const direction of allDirections) {
        const neighbor = pos.clone().add(direction).round();
        // NOTE: Points are in the center of the rect
        const rect: Rect = {
            x: numround(neighbor.x - source.width / 2),
            y: numround(neighbor.y - source.height / 2),
            width: source.width,
            height: source.height,
        };
        if (isRectOccupied(rect, manager, source)) {
            continue;
        }
        neighbors.push(createNode(neighbor, parent, pos, end));
    }
    return neighbors;
}

function createPath(node: Node): Vector2[] {
    const path = new Array<Vector2>();
    let current: Node | null = node;
    while (current !== null) {
        path.push(current.pos);
        current = current.parent;
    }
    return path.reverse();
}
