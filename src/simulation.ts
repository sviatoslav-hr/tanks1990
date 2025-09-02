import {Boom, ParticleExplosion} from '#/effect';
import {Tank} from '#/entity';
import {EnemyWave} from '#/entity/enemy-wave';
import {EntityManager} from '#/entity/manager';
import {simulatePickups} from '#/entity/pickup';
import {EnemyTank, isEnemyTank, spawnEnemy} from '#/entity/tank/enemy';
import {EventQueue} from '#/events';
import {Duration} from '#/math/duration';
import {Camera} from '#/renderer/camera';

export function initEntities(manager: EntityManager): void {
    manager.tanks = [manager.player];
    manager.projectiles = [];
    manager.effects = [];
    manager.booms = [];
    manager.world.reset();
    manager.player.respawn();
    manager.world.init(manager);
}

export function simulateEntities(
    dt: Duration,
    manager: EntityManager,
    camera: Camera,
    events: EventQueue,
): void {
    simulateEffects(dt, manager);
    const world = manager.world;
    world.update(manager);
    const nextRoom = world.activeRoom.shouldActivateNextRoom(manager.player);
    if (nextRoom) {
        world.activeRoom = nextRoom;
        world.activeRoomInFocus = false;
    }

    if (!world.activeRoomInFocus) {
        // NOTE: This will also trigger after reset.
        camera.focusOnRect(world.activeRoom.boundary);
        world.activeRoomInFocus = true;
    }

    if (world.activeRoom.started) {
        const wave = world.activeRoom.wave;
        while (wave.hasExpectedEnemies) {
            spawnEnemy(manager);
        }
    }
    simulateTanks(dt, manager.tanks, world.activeRoom.wave, events);
    simulateProjectiles(dt, manager, camera, events);
    simulatePickups(manager);
}

export function simulateTanks(
    dt: Duration,
    tanks: Tank[],
    wave: EnemyWave,
    events: EventQueue,
): void {
    for (const tank of tanks) {
        tank.update(dt); // TODO: extra into a separate function from the method
        if (!tank.dead && isEnemyTank(tank)) {
            const event = tank.shoot();
            if (event) events.push(event);
        }

        if (tank.bot && tank.shouldRespawn) {
            assert(tank instanceof EnemyTank);
            if (tank.respawnDelay.positive) {
                continue;
            } else if (wave.hasRespawnPlace) {
                // TODO: For some reason it takes way too much attempts to respawn...
                //       Need to have a deeper look into this.
                wave.spawnEnemy(tank);
            }
        }
    }
}

function simulateProjectiles(
    dt: Duration,
    manager: EntityManager,
    camera: Camera,
    events: EventQueue,
): void {
    for (const projectile of manager.projectiles) {
        if (!projectile.dead) {
            projectile.update(dt, manager, camera, events);
        }
    }
}

function simulateEffects(dt: Duration, manager: EntityManager): void {
    const effectsToRemove: ParticleExplosion[] = [];
    for (const effect of manager.effects) {
        effect.update(dt);
        if (effect.animation.finished) {
            effectsToRemove.push(effect);
        }
    }
    if (effectsToRemove.length) {
        manager.effects = manager.effects.filter((e) => !effectsToRemove.includes(e));
    }
    const boomsToRemove: Boom[] = [];
    for (const boom of manager.booms) {
        boom.update(dt);
        if (boom.animation.finished) {
            boomsToRemove.push(boom);
        }
    }
    if (boomsToRemove.length) {
        manager.booms = manager.booms.filter((b) => !boomsToRemove.includes(b));
    }
}
