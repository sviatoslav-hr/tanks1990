import {beforeEach, describe, expect, it} from 'vitest';

import {random} from '#/math/rng';
import {
    bfsWorldGraph,
    dfsWorldGraph,
    generateWorldGraph,
    getNextDepthWorldNodes,
    getPrevDepthWorldNodes,
    getWorldNodeKey,
    WorldNodeKey,
    type WorldNode,
} from '#/world/graph';

describe('gen2', () => {
    logger.level = logger.LogLevel.WARN;

    beforeEach(() => {
        random.reset('hello');
    });

    it('should generate smallest world graph', () => {
        const depth = 4;
        const graph = generateWorldGraph({
            depth,
            finalNodesCount: 1,
        });

        expect(graph.depth).toBe(depth);

        const start = graph.startNode;
        expect(start.x).toBe(0);
        expect(start.y).toBe(0);

        const [final] = graph.finalNodes;
        assert(final);
        expect(final.x).toBe(1);
        expect(final.y).toBe(0);

        // Only 2 possible paths for depth 4
        expect(graph.debugPaths.length).toBe(2);
    });

    it('should generate world graph', () => {
        const depth = 5;

        const graph = generateWorldGraph({
            depth,
            finalNodesCount: 4,
        });

        expect(graph.debugPaths.length).toBeGreaterThan(0);
        const finalNodesKeys = graph.finalNodes.map(getWorldNodeKey);

        for (const path of graph.debugPaths) {
            expect(path.length).toBe(depth);
            const pathStart = path[0];
            assert(pathStart);
            expect(getWorldNodeKey(pathStart)).toBe(getWorldNodeKey(graph.startNode));
            const pathEnd = path[path.length - 1];
            assert(pathEnd);
            expect(finalNodesKeys).toContain(getWorldNodeKey(pathEnd));
        }

        {
            const visited = new Set<WorldNodeKey>();
            for (const node of bfsWorldGraph(graph.startNode)) {
                const nodeKey = getWorldNodeKey(node);
                // Each room should be visited only once
                expect(visited.has(nodeKey)).toBe(false);
                visited.add(nodeKey);

                expect(Math.floor(node.x)).toEqual(node.x);
                expect(Math.floor(node.y)).toEqual(node.y);
                expect(node.depth <= graph.depth);

                const nextNodes = getNextDepthWorldNodes(node);
                if (node.depth === graph.depth) {
                    expect(finalNodesKeys).toContain(nodeKey);
                    expect(nextNodes.length).toBe(0);
                } else {
                    expect(nextNodes.length).toBeGreaterThan(0);
                }
            }
        }

        {
            const visited = new Set<WorldNodeKey>();
            const rooms = [...graph.finalNodes];
            let room: WorldNode | undefined;
            while ((room = rooms.pop())) {
                const roomKey = getWorldNodeKey(room);
                // Each room should be visited only once
                expect(visited.has(roomKey)).toBe(false);
                visited.add(roomKey);

                expect(Math.floor(room.x)).toEqual(room.x);
                expect(Math.floor(room.y)).toEqual(room.y);
                expect(room.depth <= graph.depth);

                const prevRooms = getPrevDepthWorldNodes(room);
                if (room.depth === 1) {
                    expect(roomKey).toBe(getWorldNodeKey(graph.startNode));
                    expect(prevRooms.length).toBe(0);
                } else {
                    expect(
                        prevRooms.length,
                        `Room ${roomKey} has no previous rooms`,
                    ).toBeGreaterThan(0);
                }
            }
        }
    });

    it('should connect paths while maintaining depth progression', () => {
        const depth = 7;
        const graph = generateWorldGraph({
            depth,
            finalNodesCount: 3,
        });

        // Verify we have multiple paths to work with
        expect(graph.debugPaths.length).toBeGreaterThan(1);

        const positions = new Map<string, WorldNode>();
        const visited = new Set<WorldNodeKey>();

        for (const room of dfsWorldGraph(graph.startNode)) {
            const roomKey = getWorldNodeKey(room);
            expect(visited.has(roomKey), `Room ${roomKey} has already been visited`).toBe(false);
            visited.add(roomKey);
            const key = `${room.x};${room.y}`;
            const positionRoom = positions.get(key);

            if (positionRoom) {
                expect(getWorldNodeKey(positionRoom)).toBe(getWorldNodeKey(room));
            } else {
                positions.set(key, room);
            }
        }
    });
});
