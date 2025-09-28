import {EnemyTank, isEnemyTank} from '#/entity/tank';
import {TankPartKind} from '#/entity/tank/generation';
import {initTank} from '#/entity/tank/simulation';
import {moveToRandomCorner, sameSign} from '#/math';
import {Duration} from '#/math/duration';
import {GameState} from '#/state';
import {Entity} from '#/entity/core';
import {Direction} from '#/math/direction';
import {Vector2Like} from '#/math/vector';
import {findPath} from '#/pathfinding';

const ENEMY_RESPAWN_DELAY = Duration.milliseconds(1000);
const ENEMY_RESPAWN_ATTEMPTS_LIMIT = 4;
const ENEMY_TARGET_SEARCH_DELAY = Duration.milliseconds(5000);

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
        if (enemyKind) enemy.changeKind(enemyKind);
        enemy.respawnDelay.setMilliseconds(0);
        respawnEnemy(enemy, state);
    } else {
        enemy.respawnDelay.setFrom(ENEMY_RESPAWN_DELAY);
        wave.queueEnemy(enemy, enemyKind);
    }
    return enemy;
}

export function respawnEnemy(tank: EnemyTank, state: GameState): boolean {
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

export function chooseEnemyDirection(tank: EnemyTank, state: GameState, dt: Duration): void {
    const player = state.player;
    const newDirection = player.dead ? null : findEnemyTargetDirection(tank, player, dt, state);
    if (newDirection != null && newDirection !== tank.direction) {
        tank.velocity = 0;
        tank.direction = newDirection;
    }
    const targetPoint = tank.targetPath[0] ?? null;
    if (targetPoint) {
        tank.dvPrev.x = tank.cx - targetPoint.x;
        tank.dvPrev.y = tank.cy - targetPoint.y;
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

export function recalculateEnemyPath(
    tank: EnemyTank,
    target: Entity,
    state: GameState,
): Direction | null {
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

export function handleMaybeMissedEnemyTargetPoint(tank: EnemyTank, state: GameState) {
    const targetPoint = tank.targetPath[0] ?? null;
    if (tank.collided || !targetPoint) return;

    // TODO: What is this code? Was I drunk or something? p - cp should always be the same
    const {x: dxPrev, y: dyPrev} = tank.dvPrev;
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
