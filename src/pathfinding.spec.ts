import {describe, expect, it, vi} from 'vitest';

import {AStarInput, findAStarPath} from '#/pathfinding';
import {v2Equals, v2ManhattanDistance, type Vector2Like as V2} from '#/math/vector';

const _ = 0;
const w = 1;
const S = 2;
const F = 3;

describe('findAStarPath', () => {
    it('should find simple path', () => {
        const map: number[][] = [
            [_, S, w, F, _, _],
            [_, w, w, w, w, _],
            [_, _, _, _, _, _],
        ];
        const input = getAStarInput(map, {x: 1, y: 1});
        const path = findAStarPath(input);
        assert(path, 'Path must be found');
        expect(path[0]).toEqual(input.start);
        expect(path[path.length - 1]).toEqual(input.goal);
    });

    it('should find complex path', () => {
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
        const input = getAStarInput(map, {x: 1, y: 1});
        const path = findAStarPath(input);
        assert(path, 'Path must be found');
        expect(path[0]).toEqual(input.start);
        expect(path[path.length - 1]).toEqual(input.goal);
    });

    it('should find path with float numbers', () => {
        const map: number[][] = [
            [_, _, w, F, _, _],
            [_, S, w, w, w, _],
            [_, _, w, _, _, _],
            [_, _, _, _, _, w],
        ];
        const input = getAStarInput(map, {x: 1.2, y: 1.2});
        input.heuristic = (a, b) => Math.round(v2ManhattanDistance(a, b));
        const path = findAStarPath(input);
        assert(path, 'Path must be found');
        expect(path[0]).toEqual(input.start);
        expect(path[path.length - 1]).toEqual(input.goal);
    });
});

interface Cell {
    pos: V2;
    type: number;
}
function getAStarInput(map: number[][], cellSize: V2): AStarInput {
    const center: V2 = {x: 0, y: 0};
    const mapSize: V2 = {x: map[0]!.length * cellSize.x, y: map.length * cellSize.y};
    const topLeft: V2 = {x: center.x - mapSize.x / 2, y: center.y - mapSize.y / 2};

    const cells: Cell[] = [];

    for (const [y, row] of map.entries()) {
        for (const [x, cell] of row.entries()) {
            const pos: V2 = {
                x: Math.round((topLeft.x + cellSize.x * x) * 100) / 100,
                y: Math.round((topLeft.y + cellSize.y * y) * 100) / 100,
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
        getNeighbors: (pos) => collectNeighbors(pos, cells, cellSize),
    };
    return input;
}

function collectNeighbors(pos: V2, cells: Cell[], cellSize: V2): V2[] {
    const neighbors: V2[] = [];
    for (const c of cells) {
        if (c.type == w) continue;
        if (v2Equals(c.pos, pos)) continue;
        // Skip if not on the same row or column
        if (c.pos.x != pos.x && c.pos.y != pos.y) continue;
        const dx = Math.round(Math.abs(c.pos.x - pos.x) * 100) / 100;
        const dy = Math.round(Math.abs(c.pos.y - pos.y) * 100) / 100;
        if (dx == cellSize.x || dy == cellSize.y) {
            neighbors.push(c.pos);
        }
    }

    return neighbors;
}
