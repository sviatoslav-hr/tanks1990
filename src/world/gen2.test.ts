import {describe, expect, it} from 'vitest';
import {generateWorldGraph, getChildRooms, type Room} from './gen2';
import {RNG} from '#/math/rng';

describe('gen2', () => {
    const rng = new RNG('hello');
    logger.level = logger.LogLevel.WARN;

    it('should generate world graph', () => {
        rng.reset();

        const depth = 7;

        const graph = generateWorldGraph({
            depth,
            maxExitsPerRoom: 2,
            finalRoomsCount: 4,
            rng: () => rng.float(),
        });

        expect(graph.paths.length).toBeGreaterThan(0);
        expect(graph.totalPaths).toEqual(graph.paths.length);

        for (const path of graph.paths) {
            expect(path.length).toBe(depth + 1);
            const pathStart = path[0];
            assert(pathStart);
            expect(pathStart.id).toBe(graph.rootRoom.id);
            const pathEnd = path[path.length - 1];
            assert(pathEnd);
            expect(pathEnd.id).toBe(graph.finalRoom.id);
        }

        {
            const rooms = [graph.rootRoom];
            let room: Room | undefined;
            let leafRoomsCount = 0;
            while ((room = rooms.pop())) {
                expect(Math.floor(room.x)).toEqual(room.x);
                expect(Math.floor(room.y)).toEqual(room.y);
                expect(room.depth <= graph.depth);
                if (room.depth === graph.depth) {
                    leafRoomsCount++;
                }
                rooms.push(...getChildRooms(room, graph));
            }
            expect(leafRoomsCount).toBe(graph.totalPaths);
        }
    });
});
