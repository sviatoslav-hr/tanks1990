import {describe, expect, it, vi} from 'vitest';

import {Block} from '#/entity/block';
import {isIntesecting} from '#/entity/core';
import {findPath} from '#/entity/pathfinding';
import {EnemyTank} from '#/entity/tank';
import {GameInput} from '#/game-input';
import {isPosInsideRect} from '#/math';
import {SoundManager} from '#/sound';
import {GameStorage} from '#/storage';
import {World} from '#/world';

vi.mock('../entity/sprite', () => {
    return {
        createStaticSprite: () => {
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
    const mockStorage: Storage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
    };
    const mockAudioContext: AudioContext = {} as AudioContext;

    it('should find a path', () => {
        const screen = {x: 0, y: 0, width: 800, height: 600};
        const storage = new GameStorage(mockStorage);
        const sounds = new SoundManager(storage, mockAudioContext);
        const world = new World(screen, storage, sounds, new GameInput());
        world.blocks = blocks;
        const enemy = new EnemyTank(world, sounds);
        enemy.x = 107.97980493109108;
        enemy.y = 429.939880663898;
        world.player.x = 758;
        world.player.y = 532.9288808634084;
        enemy.respawn();
        const path = findPath(enemy, world.player, world, 100);
        assert(path);
        expect(path.length).toBeGreaterThan(0);
        const lastP = path[path.length - 1]!;
        expect(isPosInsideRect(lastP.x, lastP.y, world.player)).toEqual(true);

        for (const p of path) {
            for (const e of world.iterateEntities()) {
                if (e === world.player) continue;
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
].map((b) => new Block({...b, texture: 'red' as any}));
