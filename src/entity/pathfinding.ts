import {Rect, isPosInsideRect} from '#/math';
import {Vector2} from '#/math/vector';
import {isRectOccupied} from '#/environment';
import {EntityManager} from '#/entity/manager';
import {Entity} from '#/entity/core';

type Node = {
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
    entity: Entity,
    destination: Rect,
    manager: EntityManager,
    maxSteps: number,
): Vector2[] | null {
    const startP = Vector2.from(entity).floor();
    startP.x += entity.width / 2;
    startP.y += entity.height / 2;
    const endP = Vector2.from(destination).floor();
    endP.x += destination.width / 2;
    endP.y += destination.height / 2;
    const allNodes = new Array<Node>();

    let currentNode: Node | null = null;
    for (let step = 0; step < maxSteps; step++) {
        currentNode = allNodes?.length > 0 ? getClosestNode(allNodes) : null;
        if (currentNode) {
            currentNode.considered = true;
        }
        if (
            currentNode &&
            isPosInsideRect(currentNode.pos.x, currentNode.pos.y, destination)
        ) {
            break;
        }
        // TODO: Some of the surrounding nodes should recompute the path since there might be a better path
        // TODO: This could be optimized
        fillSurrondingNodes(
            currentNode?.pos ?? startP,
            currentNode,
            endP,
            allNodes,
            manager,
            entity,
        );
        if (!allNodes.length) {
            // NOTE: No path found, entity is blocked/stuck
            return null;
        }
    }
    assert(currentNode !== null);
    return createPath(currentNode);
}

function fillSurrondingNodes(
    pos: Vector2,
    parent: Node | null,
    end: Vector2,
    nodes: Node[],
    manager: EntityManager,
    entity: Entity,
): void {
    // TODO: This could be optimized
    const neighbors = getNeighbors(pos, parent, end, manager, entity);
    const filteredNeighbors = neighbors.filter((n) => {
        return !nodes.some((node) => node.pos.equals(n.pos));
    });
    // TODO: Can this happen so that there are no neighbors?
    // assert(filteredNeighbors.length > 0);
    nodes.push(...filteredNeighbors);
}

function createNode(
    pos: Vector2,
    parent: Node | null,
    start: Vector2,
    end: Vector2,
): Node {
    // Technically this should be the cost of the path, not the distance between the points
    const g = pos.manhattanDistanceTo(start);
    const h = pos.manhattanDistanceTo(end);
    const f = g + h;
    return {pos, g, h, f, considered: false, parent: parent};
}

function getClosestNode(nodes: Node[]): Node {
    let closest = nodes[0];
    assert(closest !== undefined);
    for (const node of nodes) {
        if (node.considered) {
            continue;
        }
        if (node.f < closest.f) {
            closest = node;
        }
    }
    return closest;
}

function getNeighbors(
    pos: Vector2,
    parent: Node | null,
    end: Vector2,
    manager: EntityManager,
    entity: Entity,
): Node[] {
    const neighbors = new Array<Node>();
    const offsetX = entity.width / 3;
    const offsetY = entity.height / 3;
    const allDirections = [
        new Vector2(0, -offsetY),
        new Vector2(offsetX, 0),
        new Vector2(0, offsetY),
        new Vector2(-offsetX, 0),
    ];
    for (const direction of allDirections) {
        const neighbor = pos.clone().add(direction).floor();
        // NOTE: Points are in the center of the entity
        const rect: Rect = {
            x: neighbor.x - entity.width / 2,
            y: neighbor.y - entity.height / 2,
            width: entity.width,
            height: entity.height,
        };
        if (isRectOccupied(rect, manager, entity)) {
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
