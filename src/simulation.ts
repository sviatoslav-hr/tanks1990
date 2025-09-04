import {Boom, ParticleExplosion} from '#/effect';
import {Tank} from '#/entity';
import {EnemyWave} from '#/entity/enemy-wave';
import {simulatePickups} from '#/entity/pickup';
import {EnemyTank, isEnemyTank, spawnEnemy} from '#/entity/tank/enemy';
import {EventQueue} from '#/events';
import {Duration} from '#/math/duration';
import {Camera} from '#/renderer/camera';
import {GameState} from '#/state';

export function initEntities(state: GameState): void {
    state.tanks = [state.player];
    state.projectiles = [];
    state.effects = [];
    state.booms = [];
    state.world.reset();
    state.player.respawn();
    state.world.init(state);
}

export function simulateEntities(
    dt: Duration,
    state: GameState,
    camera: Camera,
    events: EventQueue,
): void {
    simulateEffects(dt, state);
    const world = state.world;
    world.update(state);
    const nextRoom = world.activeRoom.shouldActivateNextRoom(state.player);
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
            spawnEnemy(state);
        }
    }
    simulateTanks(dt, state.tanks, world.activeRoom.wave, events);
    simulateProjectiles(dt, state, camera, events);
    simulatePickups(state);
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
    state: GameState,
    camera: Camera,
    events: EventQueue,
): void {
    for (const projectile of state.projectiles) {
        if (!projectile.dead) {
            projectile.update(dt, state, camera, events);
        }
    }
}

function simulateEffects(dt: Duration, state: GameState): void {
    const effectsToRemove: ParticleExplosion[] = [];
    for (const effect of state.effects) {
        effect.update(dt);
        if (effect.animation.finished) {
            effectsToRemove.push(effect);
        }
    }
    if (effectsToRemove.length) {
        state.effects = state.effects.filter((e) => !effectsToRemove.includes(e));
    }
    const boomsToRemove: Boom[] = [];
    for (const boom of state.booms) {
        boom.update(dt);
        if (boom.animation.finished) {
            boomsToRemove.push(boom);
        }
    }
    if (boomsToRemove.length) {
        state.booms = state.booms.filter((b) => !boomsToRemove.includes(b));
    }
}
