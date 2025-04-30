import {describe, expect, it, vi} from 'vitest';

import {isIntesecting} from '#/entity/core';
import {findPath} from '#/entity/pathfinding';
import {isPosInsideRect} from '#/math';
import {EntityManager} from '#/entity/manager';
import {EnemyTank} from './tank';
import {Duration} from '#/math/duration';
import {random} from '#/math/rng';

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
    it('should find a path', async () => {
        const seed = 'default'; // NOTE: Using a fixed seed for reproducibility.
        random.reset(seed);
        const manager = new EntityManager();
        manager.world.roomsLimit = 1;
        manager.init();
        manager.spawnEnemy(manager.world.activeRoom);
        manager.updateTanks(Duration.milliseconds(0));
        const enemy = manager.tanks.find((t) => t instanceof EnemyTank) as EnemyTank;
        assert(enemy, 'Enemy tank not found');
        const target = manager.player;
        // enemy.x = -252.98095555594392;
        // enemy.y = 100.35220832853697;
        enemy.x = -243.3373333303148;
        enemy.y = 109.75;
        target.x = -21.25;
        target.y = -21.25;
        expect(enemy.id).toEqual(69);
        enemy.respawn();
        const path = findPath(enemy, target, manager, 100, false);
        assert(path);
        expect(path.length).toBeGreaterThan(0);
        const lastP = path[path.length - 1]!;
        expect(isPosInsideRect(lastP.x, lastP.y, target), 'Path did not reach the target').toEqual(
            true,
        );

        for (const p of path) {
            for (const e of manager.iterateCollidable()) {
                if (e === target) continue;
                if (e === enemy) continue;
                expect(
                    isPosInsideRect(p.x, p.y, e),
                    `Path point intersected by ${e.constructor.name} at {${e.x};${e.y};${e.width};${e.height}}`,
                ).toBe(false);
                const rect = {
                    x: p.x - enemy.width / 2,
                    y: p.y - enemy.height / 2,
                    width: enemy.width,
                    height: enemy.height,
                };
                expect(
                    isIntesecting(rect, e),
                    `Path rect intersected by ${e.constructor.name} at {${e.x};${e.y};${e.width};${e.height}}`,
                ).toBe(false);
            }
        }
    });
});
