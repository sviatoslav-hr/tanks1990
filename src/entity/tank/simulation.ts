import {spawnExplosionEffect} from '#/effect';
import {Entity, moveEntity} from '#/entity/core';
import {spawnProjectile} from '#/entity/projectile';
import {EnemyTank, isEnemyTank, isPlayerTank, PlayerTank, Tank} from '#/entity/tank';
import {SHIELD_SPAWN_DURATION, TankPartKind} from '#/entity/tank/generation';
import {moveToRandomCorner, sameSign} from '#/math';
import {Direction} from '#/math/direction';
import {Duration} from '#/math/duration';
import {Vector2Like} from '#/math/vector';
import {findPath} from '#/pathfinding';
import {soundEvent} from '#/sound-event';
import {GameState} from '#/state';

const STOPPING_TIME = Duration.milliseconds(50);
const ENEMY_RESPAWN_DELAY = Duration.milliseconds(1000);
const ENEMY_TARGET_SEARCH_DELAY = Duration.milliseconds(5000);
const ENEMY_RESPAWN_ATTEMPTS_LIMIT = 4;

export function simulateAllTanks(dt: Duration, state: GameState): void {
    const currentWave = state.world.activeRoom.wave;
    for (const tank of state.tanks) {
        if (!tank.healthAnimation.finished) {
            // NOTE: For dramatic effect, game draws health bar for some time even if tank is dead
            tank.healthAnimation.update(dt);
        }

        if (tank.dead) {
            if (isEnemyTank(tank) && tank.shouldRespawn && currentWave.hasRespawnPlace) {
                tank.respawnDelay.sub(dt).max(0);
                if (!tank.respawnDelay.positive) {
                    respawnEnemy(tank, state);
                }
            }
            continue;
        }

        let dvPrev: Vector2Like | undefined;
        if (isEnemyTank(tank)) {
            const player = state.player;
            const newDirection = player.dead
                ? null
                : findEnemyTargetDirection(tank, player, dt, state);
            if (newDirection != null && newDirection !== tank.direction) {
                tank.velocity = 0;
                tank.direction = newDirection;
            }
            const targetPoint = tank.targetPath[0] ?? null;
            if (targetPoint) {
                const dxPrev = tank.cx - targetPoint.x;
                const dyPrev = tank.cy - targetPoint.y;
                dvPrev = {x: dxPrev, y: dyPrev};
            }
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

        const collided = state.findCollided(tank);
        if (collided) {
            tank.collided = true;
            if (isEnemyTank(tank) && collided.id !== state.player.id && !state.player.dead) {
                // PERF: If enemies continue to collide, this will blow up the performance
                tank.direction = recalculateEnemyPath(tank, state.player, state) ?? tank.direction;
            }
            tank.x = prevX;
            tank.y = prevY;
            tank.velocity = 0;
            if (collided instanceof Tank) {
                // collided.handleCollision(tank); TODO: is this needed? (prob yes)
                collided.collided = true;
            }
        }
        simulateTankShield(tank, dt);

        if (isEnemyTank(tank)) {
            const targetPoint = tank.targetPath[0] ?? null;
            if (!tank.collided && targetPoint && dvPrev) {
                handleMaybeMissedTargetPoint(tank, targetPoint, state, dvPrev);
            }
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
    activateTankShield(tank);

    if (isEnemyTank(tank)) {
        tank.shouldRespawn = false;
        tank.targetPath = [];
        tank.respawnDelay.setMilliseconds(0);
        tank.targetSearchTimer.setMilliseconds(0);
    } else if (isPlayerTank(tank)) {
        tank.x = -tank.width / 2;
        tank.y = -tank.height / 2;
        tank.direction = Direction.NORTH;
        tank.velocity = 0;
        tank.survivedFor.milliseconds = 0;
    }
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
    tank.healthAnimation.reset();
    tank.dead = tank.health <= 0;
    if (tank.dead) {
        spawnExplosionEffect(state, tank.id);
        if (tank.bot) {
            const wave = state.world.activeRoom.wave;
            wave.acknowledgeEnemyDied(tank.id);
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

export function spawnEnemy(
    state: GameState,
    enemyKind?: TankPartKind,
    skipDelay = false,
): EnemyTank {
    const deadEnemy = state.tanks.find(
        (t) => isEnemyTank(t) && t.dead && !t.shouldRespawn,
    ) as EnemyTank;
    // NOTE: Enemy will be dead initially, but it will be re-spawned automatically with the delay
    // to not spawn it immediately and also have the ability to not spawn everyone at once.
    const enemy = deadEnemy ?? new EnemyTank();
    assert(enemy.dead);
    if (!deadEnemy) {
        // NOTE: Player should be drawn last, so enemies are added to the beginning of the array.
        state.tanks.unshift(enemy);
        logger.debug('[Manager] Created new enemy tank', enemy.id);
    } else {
        logger.debug('[Manager] Reused dead enemy tank', enemy.id);
    }
    const wave = state.world.activeRoom.wave;
    enemy.shouldRespawn = true;
    if (skipDelay) {
        enemy.respawnDelay.setMilliseconds(0);
        respawnEnemy(enemy, state);
    } else {
        enemy.respawnDelay.setFrom(ENEMY_RESPAWN_DELAY);
        wave.queueEnemy(enemy, enemyKind);
    }
    return enemy;
}

function respawnEnemy(tank: EnemyTank, state: GameState): boolean {
    assert(tank.dead);
    assert(tank.shouldRespawn);
    assert(!tank.respawnDelay.positive);
    const prevX = tank.x;
    const prevY = tank.y;
    for (let attempt = 0; attempt < ENEMY_RESPAWN_ATTEMPTS_LIMIT; attempt++) {
        const room = state.world.activeRoom;
        // TODO: Be more creative with spawn points
        moveToRandomCorner(tank, room.boundary);
        const collided = state.findCollided(tank);
        if (!collided) {
            initTank(tank);
            state.world.activeRoom.wave.acknowledgeEnemySpawned(tank.id);
            return true;
        }
    }
    tank.x = prevX;
    tank.y = prevY;
    logger.warn('Failed to respawn enemy tank %d', tank.id);
    return false;
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
    if (state.playing) {
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

function handleMaybeMissedTargetPoint(
    tank: EnemyTank,
    targetPoint: Vector2Like,
    state: GameState,
    dvPrev: Vector2Like,
) {
    const {x: dxPrev, y: dyPrev} = dvPrev;
    const dx = tank.cx - targetPoint.x;
    const dy = tank.cy - targetPoint.y;
    // NOTE: If entity overstepped the target point, stop it and move back to target.
    //       But only if case of a turn, because in a straight line tank starts bugging.
    if ((dxPrev === dx && !sameSign(dyPrev, dy)) || (dyPrev === dy && !sameSign(dxPrev, dx))) {
        tank.targetPath.shift();
        if (isEnemyAtPoint(tank, targetPoint)) {
        }
        const nextPoint = tank.targetPath[0];
        if (nextPoint) {
            const nextDir = getTankDirectionToPoint(tank, nextPoint);
            if (!nextDir) return;
            const targetDir = tank.direction;
            if (targetDir === nextDir) {
                return;
            }
            tank.velocity = 0;
            const prevX = tank.x;
            const prevY = tank.y;
            if (dxPrev === dx) {
                tank.y = targetPoint.y - tank.height / 2;
            } else if (dyPrev === dy) {
                tank.x = targetPoint.x - tank.width / 2;
            }
            const c = state.findCollided(tank);
            if (c) {
                tank.x = prevX;
                tank.y = prevY;
            }
        }
    }
}

function findEnemyTargetDirection(
    tank: EnemyTank,
    target: Entity,
    dt: Duration,
    state: GameState,
): Direction | null {
    tank.targetSearchTimer.sub(dt).max(0);
    if (tank.targetPath.length && tank.targetSearchTimer.positive) {
        const targetPoint = tank.targetPath[0];
        if (!targetPoint) return null;
        if (isEnemyAtPoint(tank, targetPoint)) {
            tank.targetPath.shift();
            const nextPoint = tank.targetPath[0];
            return nextPoint ? getTankDirectionToPoint(tank, nextPoint) : null;
        }
        return getTankDirectionToPoint(tank, targetPoint);
    }

    return recalculateEnemyPath(tank, target, state);
}

function recalculateEnemyPath(tank: EnemyTank, target: Entity, state: GameState): Direction | null {
    tank.targetSearchTimer.setFrom(ENEMY_TARGET_SEARCH_DELAY);
    const path = findPath(tank, target, state, 1000, undefined, false);
    if (path) {
        tank.targetPath = path;
        const nextPoint = tank.targetPath[0];
        assert(nextPoint);
        return getTankDirectionToPoint(tank, nextPoint);
    }
    return null;
}

function isEnemyAtPoint(tank: EnemyTank, next: Vector2Like): boolean {
    // NOTE: If entity is close enough to the target point, consider it reached
    const eps = 1;
    const diff = Math.max(Math.abs(tank.cx - next.x), Math.abs(tank.cy - next.y));
    return diff < eps;
}

function getTankDirectionToPoint(tank: EnemyTank, next: Vector2Like): Direction | null {
    const dx = next.x - Math.floor(tank.cx);
    if (dx !== 0) {
        return dx > 0 ? Direction.EAST : Direction.WEST;
    }
    const dy = next.y - Math.floor(tank.cy);
    if (dy !== 0) {
        return dy > 0 ? Direction.SOUTH : Direction.NORTH;
    }
    return null;
}
