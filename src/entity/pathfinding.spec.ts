import {describe, expect, it, vi} from 'vitest';

import {isIntesecting} from '#/entity/core';
import {findPath} from '#/entity/pathfinding';
import {isPosInsideRect} from '#/math';
import {EntityManager} from '#/entity/manager';
import {Block} from '#/entity/block';
import {EnemyTank} from './tank';

vi.mock('../entity/sprite', () => {
    return {
        createStaticSprite: () => {
            return {
                draw: () => {},
                update: () => {},
            };
        },
        createTileSprite: () => {
            return {
                draw: () => {},
                update: () => {},
            };
        },
        createShieldSprite: () => {
            return {
                draw: () => {},
                update: () => {},
            };
        },
        createTankSprite: () => {
            return {
                draw: () => {},
                update: () => {},
            };
        },
        Sprite: class {},
    };
});

describe('Pathfinding', () => {
    it('should find a path', () => {
        const manager = new EntityManager();
        manager.world.boundary.x = 0;
        manager.world.boundary.y = 0;
        manager.world.boundary.width = 800;
        manager.world.boundary.height = 600;
        manager.world.activeRoom.blocks = generateBlocks(manager);
        const enemy = new EnemyTank(manager);
        enemy.respawnDelay.setMilliseconds(0);
        enemy.x = 107.97980493109108;
        enemy.y = 429.939880663898;
        manager.player.x = 758;
        manager.player.y = 532.9288808634084;
        enemy.respawn();
        const path = findPath(enemy, manager.player, manager, 100);
        assert(path);
        expect(path.length).toBeGreaterThan(0);
        const lastP = path[path.length - 1]!;
        expect(isPosInsideRect(lastP.x, lastP.y, manager.player)).toEqual(true);

        for (const p of path) {
            for (const e of manager.iterateEntities()) {
                if (e === manager.player) continue;
                if (e === enemy) continue;
                expect(
                    isPosInsideRect(p.x, p.y, e),
                    `Center intersected by ${e.constructor.name} at {${e.x};${e.y};${e.width};${e.height}}`,
                ).toBe(false);
                const rect = {
                    x: p.x - enemy.width / 2,
                    y: p.y - enemy.height / 2,
                    width: enemy.width,
                    height: enemy.height,
                };
                expect(
                    isIntesecting(rect, e),
                    `Rect intersected by ${e.constructor.name} at {${e.x};${e.y};${e.width};${e.height}}`,
                ).toBe(false);
            }
        }
    });
});

function generateBlocks(manager: EntityManager) {
    const blocks = [
        {
            x: 650,
            y: 100,
            width: 50,
            height: 50,
            dead: false,
        },
        {
            x: 400,
            y: 500,
            width: 50,
            height: 50,
            dead: false,
        },
        {
            x: 450,
            y: 100,
            width: 50,
            height: 50,
            dead: false,
        },
        {
            x: 400,
            y: 300,
            width: 50,
            height: 50,
            dead: false,
        },
        {
            x: 150,
            y: 400,
            width: 50,
            height: 50,
            dead: false,
        },
        {
            x: 600,
            y: 350,
            width: 50,
            height: 50,
            dead: false,
        },
        {
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            dead: false,
        },
        {
            x: 200,
            y: 50,
            width: 50,
            height: 50,
            dead: false,
        },
        {
            x: 700,
            y: 500,
            width: 50,
            height: 50,
            dead: false,
        },
    ].map((b) => new Block(manager, {...b, texture: 'red' as any}));
    return blocks;
}
