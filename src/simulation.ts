import {Boom, ParticleExplosion} from '#/effect';
import {simulatePickups} from '#/entity/pickup';
import {initTank, simulateAllTanks, spawnEnemy} from '#/entity/tank/simulation';
import {Duration} from '#/math/duration';
import {Camera} from '#/renderer/camera';
import {GameState} from '#/state';

export function initEntities(state: GameState): void {
    state.tanks = [state.player];
    state.projectiles = [];
    state.effects = [];
    state.booms = [];
    state.world.reset();
    initTank(state.player);
    state.world.init(state);
}

export function simulateEntities(dt: Duration, state: GameState, camera: Camera): void {
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
    simulateAllTanks(dt, state);
    simulateProjectiles(dt, state, camera);
    simulatePickups(state);
}

function simulateProjectiles(dt: Duration, state: GameState, camera: Camera): void {
    for (const projectile of state.projectiles) {
        if (!projectile.dead) {
            projectile.update(dt, state, camera);
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
