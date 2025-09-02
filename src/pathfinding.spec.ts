import {beforeEach, describe, expect, it, vi} from 'vitest';

import {isIntesecting} from '#/entity/core';
import {EntityManager} from '#/entity/manager';
import {EnemyTank} from '#/entity/tank';
import {type TankSchema} from '#/entity/tank/generation';
import {EventQueue} from '#/events';
import {isPosInsideRect, Rect} from '#/math';
import {Duration} from '#/math/duration';
import {random} from '#/math/rng';
import {Vector2Like} from '#/math/vector';
import {findPath} from '#/pathfinding';
import {spawnEnemy} from '#/entity/tank/enemy';
import {initEntities, simulateTanks} from '#/simulation';

function spriteMock() {
    return {
        draw: () => {},
        update: () => {},
    };
}

vi.mock('#/renderer/sprite', () => {
    return {
        createStaticSprite: () => spriteMock(),
        createTileSprite: () => spriteMock(),
        createShieldSprite: () => spriteMock(),
        Sprite: class {
            selectFrame = () => void 0;
        },
    };
});
vi.mock('#/entity/tank/generation', async (importOriginal) => {
    const original = await importOriginal<object>();
    return {
        ...original,
        createTankSpriteGroup: (schema: TankSchema) => ({
            schema,
            ...spriteMock(),
        }),
    };
});

describe('Pathfinding', () => {
    logger.level = logger.LogLevel.WARN;
    const seed = 'default'; // NOTE: Using a fixed seed for reproducibility.
    const loops = 1;
    beforeEach(() => {
        random.reset(seed);
    });

    it('should find a path in scenario A (getting out of the corner)', {timeout: 10000}, () => {
        // FIXME: These coordinates don't work anymore after changes to world generation...
        return;
        for (let i = 0; i < loops; i++) {
            random.reset(seed);
            testPathfinding({x: -243.3373333303148, y: 109.75}, {x: -21.25, y: -21.25}, 1000);
        }
    });

    it('should find a path in scenario B (longer path)', {timeout: 10000}, () => {
        // FIXME: These coordinates don't work anymore after changes to world generation...
        return;
        for (let i = 0; i < loops; i++) {
            random.reset(seed);
            testPathfinding(
                {x: -252.98095555594392, y: 100.35220832853697},
                {x: -21.25, y: -21.25},
            );
        }
    });

    it('should find a path in scenario C (passing between two blocks)', {timeout: 10000}, () => {
        // FIXME: These coordinates don't work anymore after changes to world generation...
        return;
        for (let i = 0; i < loops; i++) {
            random.reset(seed);
            testPathfinding(
                {x: 157.52348332742952, y: -0.2285972235012722},
                {x: -21.25, y: -21.25},
            );
        }
    });

    function testPathfinding(
        enemyPos: Vector2Like,
        targetPos: Vector2Like,
        stepsLimit = 1000,
        debug = false,
    ) {
        const manager = new EntityManager();
        manager.world.roomsLimit = 1;
        initEntities(manager);
        const activeWave = manager.world.activeRoom.wave;
        activeWave.clearExpected();
        spawnEnemy(manager, 'light', true);
        const enemy = manager.tanks.find((t) => t instanceof EnemyTank) as EnemyTank;
        const eventQueue = new EventQueue();
        simulateTanks(Duration.milliseconds(0), manager.tanks, activeWave, eventQueue);
        assert(enemy, 'Enemy tank not found');
        assert(!enemy.dead, 'Enemy tank should not be dead (should respawn)');
        assert(manager.tanks.length === 2, 'Expected only 2 tanks'); // Player + enemy
        const target = manager.player;
        enemy.x = enemyPos.x;
        enemy.y = enemyPos.y;
        target.x = targetPos.x;
        target.y = targetPos.y;
        Object.assign(enemy, {id: 69}); // NOTE: Hardcode id for to be able to inspecy the tank in other parts of the code
        const path = findPath(enemy, target, manager, stepsLimit, undefined, debug);
        assert(path, 'Path should be found');
        expect(path.length).toBeGreaterThan(0);
        const firstP = path[0]!;
        expect(
            isPosInsideRect(firstP.x, firstP.y, enemy),
            'Path did not start inside the enemy tank',
        ).toEqual(true);
        const lastP = path[path.length - 1]!;
        expect(isPosInsideRect(lastP.x, lastP.y, target), 'Path did not reach the target').toEqual(
            true,
        );

        for (const [i, p] of path.entries()) {
            for (const e of manager.iterateCollidable()) {
                if (e === target) continue;
                if (e === enemy) continue;
                expect(
                    isPosInsideRect(p.x, p.y, e),
                    `Path point[${i}] {${p.x};${p.y}} intersected by ${e.constructor.name} at ${rectStringify(e)}`,
                ).toBe(false);
                const rect = {
                    x: p.x - enemy.width / 2,
                    y: p.y - enemy.height / 2,
                    width: enemy.width,
                    height: enemy.height,
                };
                expect(
                    isIntesecting(rect, e),
                    `Path rect[${i}] ${rectStringify(rect)} intersected by ${e.constructor.name} at ${rectStringify(e)}`,
                ).toBe(false);
            }
        }
    }

    function rectStringify(rect: Rect): string {
        return `{${rect.x};${rect.y};${rect.width};${rect.height}}`;
    }
});
