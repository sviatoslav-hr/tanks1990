import {beforeEach, describe, expect, it, vi} from 'vitest';

import {isIntesecting} from '#/entity/core';
import {findPath} from '#/entity/pathfinding';
import {isPosInsideRect} from '#/math';
import {EntityManager} from '#/entity/manager';
import {EnemyTank} from './tank';
import {Duration} from '#/math/duration';
import {random} from '#/math/rng';
import {Vector2Like} from '#/math/vector';

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
    beforeEach(() => {
        const seed = 'default'; // NOTE: Using a fixed seed for reproducibility.
        random.reset(seed);
    });

    it('should find a path in scenario A (getting out of the corner)', async () => {
        testPathfinding({x: -243.3373333303148, y: 109.75}, {x: -21.25, y: -21.25});
    });

    it('should find a path in scenario B (longer path)', async () => {
        testPathfinding({x: -252.98095555594392, y: 100.35220832853697}, {x: -21.25, y: -21.25});
    });

    function testPathfinding(
        enemyPos: Vector2Like,
        targetPos: Vector2Like,
        stepsLimit = 200,
        debug = false,
    ) {
        const manager = new EntityManager();
        manager.world.roomsLimit = 1;
        manager.init();
        manager.spawnEnemy(manager.world.activeRoom);
        manager.updateTanks(Duration.milliseconds(0));
        const enemy = manager.tanks.find((t) => t instanceof EnemyTank) as EnemyTank;
        assert(enemy, 'Enemy tank not found');
        const target = manager.player;
        enemy.x = enemyPos.x;
        enemy.y = enemyPos.y;
        target.x = targetPos.x;
        target.y = targetPos.y;
        Object.assign(enemy, {id: 69}); // NOTE: Hardcode id for to be able to inspecy the tank in other parts of the code
        enemy.respawn();
        const path = findPath(enemy, target, manager, stepsLimit, debug);
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
    }
});
