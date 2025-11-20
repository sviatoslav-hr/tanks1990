import {spawnExplosionEffect} from '#/effect';
import {moveEntity} from '#/entity/core';
import {acknowledgeEnemyDied, waveHasRespawnPlace} from '#/entity/enemy-wave';
import {findCollided} from '#/entity/lookup';
import {spawnProjectile} from '#/entity/projectile';
import {isEnemyTank, isPlayerTank, PlayerTank, Tank} from '#/entity/tank';
import {
    chooseEnemyDirection,
    hanldeOversteppedEnemyPathPoint,
    respawnEnemy,
    tryRestartEnemyPathfinding,
} from '#/entity/tank/enemy';
import {SHIELD_SPAWN_DURATION} from '#/entity/tank/generation';
import {Direction} from '#/math/direction';
import {Duration} from '#/math/duration';
import {Vector2Like} from '#/math/vector';
import {soundEvent} from '#/sound-event';
import {GameState, isPlaying} from '#/state';

const STOPPING_TIME = Duration.milliseconds(50);

export function simulateAllTanks(dt: Duration, state: GameState): void {
    const currentWave = state.world.activeRoom.wave;
    for (const tank of state.tanks) {
        if (!tank.healthAnimation.finished) {
            // NOTE: For dramatic effect, game draws health bar for some time even if tank is dead
            tank.healthAnimation.update(dt);
        }

        if (tank.dead) {
            if (isEnemyTank(tank) && tank.shouldRespawn && waveHasRespawnPlace(currentWave)) {
                tank.respawnDelay.sub(dt).max(0);
                if (!tank.respawnDelay.positive) {
                    respawnEnemy(tank, state);
                }
            }
            continue;
        }

        if (isEnemyTank(tank)) {
            chooseEnemyDirection(tank, state, dt);
        }

        tank.shootingDelay.sub(dt).max(0);
        const prevX = tank.x;
        const prevY = tank.y;

        if (tank.moving) {
            tank.sprite.update(dt);
            // On every frame just assume that the tank is not colliding anymore if it's still moving.
            tank.collided = false;
        }

        simulateTankMovement(dt, tank);

        const collided = findCollided(state, tank);
        if (collided) {
            tank.collided = true;
            if (isEnemyTank(tank) && collided.id !== state.player.id && !state.player.dead) {
                tryRestartEnemyPathfinding(tank);
            }
            tank.x = prevX;
            tank.y = prevY;
            tank.velocity = 0;
            if (collided instanceof Tank) {
                collided.collided = true;
                if (isEnemyTank(collided)) {
                    tryRestartEnemyPathfinding(collided);
                }
            }
        }

        simulateTankShield(tank, dt);

        if (isEnemyTank(tank)) {
            hanldeOversteppedEnemyPathPoint(tank, state);
            tryTriggerTankShooting(tank, state);
        } else if (isPlayerTank(tank) && !tank.completedGame) {
            tank.survivedFor.add(dt);
        }
    }
}

export function initTank(tank: Tank): void {
    tank.dead = false;
    tank.health = tank.schema.maxHealth;
    tank.prevHealth = tank.health;
    tank.collided = false;
    tank.damageMult = 1;
    tank.speedMult = 1;
    tank.reloadMult = 1;
    tank.shootingDelay.setMilliseconds(tank.schema.reloadTime.milliseconds);

    if (isEnemyTank(tank)) {
        assert(tank.shouldRespawn); // Enemy should be initialized only during respawn
        tank.shouldRespawn = false;
        tank.targetPath = [];
        tank.respawnDelay.setMilliseconds(0);
        tank.pathfindDelay.setMilliseconds(0);
    } else if (isPlayerTank(tank)) {
        tank.x = -tank.width / 2;
        tank.y = -tank.height / 2;
        tank.direction = Direction.NORTH;
        tank.velocity = 0;
        tank.survivedFor.milliseconds = 0;
    }

    activateTankShield(tank);
}

export function changePlayerDirection(tank: PlayerTank, direction: Direction | null): void {
    tank.moving = direction != null;
    if (direction != null) {
        if (direction !== tank.direction) {
            tank.velocity = 0;
        }
        tank.direction = direction;
    }
}

export function damageTank(tank: Tank, damage: number, state: GameState): boolean {
    if (isPlayerTank(tank) && tank.invincible) {
        return false;
    }
    if (tank.dead) {
        logger.error('[Tank] Trying to kill a dead entity');
        return false;
    }
    if (tank.hasShield) {
        return false;
    }
    tank.prevHealth = tank.health;
    tank.health = Math.max(0, tank.health - damage);
    // TODO: If the animation is still active, it should not just reset,
    //       but instead make a smooth transition. Otherwise there might be cases when health
    //       goes down and then up and then down again, which is a visual bug.
    //       #SmoothHealthAnimation
    tank.healthAnimation.reset();
    tank.dead = tank.health <= 0;
    if (tank.dead) {
        spawnExplosionEffect(state, tank, isEnemyTank(tank));
        if (tank.bot) {
            const wave = state.world.activeRoom.wave;
            acknowledgeEnemyDied(wave, tank.id);
        }
        soundEvent(state.sounds, tank.bot ? 'enemy-destroyed' : 'player-destroyed');
    } else if (tank.health < tank.prevHealth) {
        soundEvent(state.sounds, tank.bot ? 'enemy-damaged' : 'player-damaged');
    }
    return tank.dead;
}

export function restoreTankHealth(tank: Tank, amount: number): boolean {
    assert(!tank.dead);
    assert(tank.needsHealing);
    tank.prevHealth = tank.health;
    tank.health = Math.min(tank.schema.maxHealth, tank.health + amount);
    // TODO: Look #SmoothHealthAnimation
    tank.healthAnimation.reset();
    return true;
}

export function activateTankShield(tank: Tank, duration: Duration = SHIELD_SPAWN_DURATION): void {
    if (tank.hasShield) {
        tank.shieldTimer.add(duration);
    } else {
        tank.hasShield = true;
        tank.shieldTimer.setFrom(duration);
        updateTankShieldBoundary(tank);
    }
}

function simulateTankShield(tank: Tank, dt: Duration): void {
    tank.shieldSprite.update(dt);

    if (tank.shieldTimer.positive || tank.hasShield) {
        tank.shieldTimer.sub(dt).max(0);
        if (!tank.shieldTimer.positive) {
            tank.hasShield = false;
        }
        updateTankShieldBoundary(tank);
    }
}

function updateTankShieldBoundary(tank: Tank): void {
    const padding = 3;
    tank.shieldBoundary.x = tank.x - padding;
    tank.shieldBoundary.y = tank.y - padding;
    tank.shieldBoundary.width = tank.width + padding * 2;
    tank.shieldBoundary.height = tank.height + padding * 2;
}

function simulateTankMovement(dt: Duration, tank: Tank) {
    const maxSpeed = tank.schema.maxSpeed * tank.speedMult;
    // NOTE: Scale also the stopping time, otherwise the tank is too difficult to control.
    const stoppingTime = STOPPING_TIME.seconds / tank.speedMult;
    const acceleration = tank.moving
        ? maxSpeed / tank.schema.topSpeedReachTime.seconds
        : -tank.velocity / stoppingTime;

    tank.lastAcceleration = acceleration;
    const newVelocity = acceleration * dt.seconds + tank.velocity;
    // v' = a*dt + v
    tank.velocity = Math.min(Math.max(0, newVelocity), maxSpeed);
    assert(tank.velocity >= 0);
    // p' = 1/2*a*dt^2 + v*dt + p   ==>    dp = p' - p = 1/2*a*dt^2 + v*dt
    const movementOffset = 0.5 * acceleration * dt.seconds ** 2 + tank.velocity * dt.seconds;
    moveEntity(tank, movementOffset, tank.direction);
}

export function tryTriggerTankShooting(tank: Tank, state: GameState): void {
    if (tank.shootingDelay.positive) return;
    if (isPlaying(state)) {
        // NOTE: Play sounds only during active game-play to not pollute the other states
        soundEvent(state.sounds, tank.bot ? 'enemy-shooting' : 'player-shooting');
    }
    const damage = Math.round(tank.schema.damage * tank.damageMult);
    spawnProjectile(state, tank.id, getTankShootingOrigin(tank), tank.direction, damage);
    tank.shootingDelay.setMilliseconds(tank.schema.reloadTime.milliseconds / tank.reloadMult);
}

function getTankShootingOrigin(tank: Tank): Vector2Like {
    switch (tank.direction) {
        case Direction.NORTH:
            return {x: tank.x + tank.width / 2, y: tank.y};
        case Direction.EAST:
            return {x: tank.x + tank.width, y: tank.y + tank.height / 2};
        case Direction.SOUTH:
            return {x: tank.x + tank.width / 2, y: tank.y + tank.height};
        case Direction.WEST:
            return {x: tank.x, y: tank.y + tank.height / 2};
    }
}
