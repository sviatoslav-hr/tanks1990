import {Entity} from '#/entity/core';
import {Tank} from '#/entity/tank/base';
import {createTankSpriteGroup, makeTankSchema} from '#/entity/tank/generation';
import {sameSign} from '#/math';
import {Direction} from '#/math/direction';
import {Duration} from '#/math/duration';
import {Vector2, Vector2Like} from '#/math/vector';
import {findPath} from '#/pathfinding';
import {createShieldSprite} from '#/renderer/sprite';

export function isEnemyTank(tank: Tank): tank is EnemyTank {
    return tank.bot;
}

const TARGET_SEARCH_DELAY = Duration.milliseconds(5000);
const RESPAWN_DELAY = Duration.milliseconds(1000);

export class EnemyTank extends Tank implements Entity {
    readonly bot = true;
    schema = makeTankSchema(this.bot, 'medium');
    sprite = createTankSpriteGroup(this.bot, this.schema);
    shieldSprite = createShieldSprite('enemy');

    moving = true;
    targetPath: Vector2[] = [];
    targetSearchTimer = TARGET_SEARCH_DELAY.clone();
    respawnDelay = RESPAWN_DELAY.clone();

    update(dt: Duration): void {
        if (this.dead && this.room.wave.hasRespawnPlace) {
            this.respawnDelay.sub(dt).max(0);
            return;
        }
        if (!this.dead) {
            const player = this.manager.player;
            // TODO: if player is dead, choose a random direction
            let newDirection = player.dead ? null : this.findTargetDirection(player, dt);
            if (newDirection != null && newDirection !== this.direction) {
                this.velocity = 0;
                this.direction = newDirection;
            }
        }
        const targetPoint = this.targetPath[0] ?? null;
        if (targetPoint && !this.dead) {
            const dxPrev = this.cx - targetPoint.x;
            const dyPrev = this.cy - targetPoint.y;
            super.update(dt);
            if (!this.collided) {
                this.handleMaybeMissedTargetPoint(targetPoint, dxPrev, dyPrev);
            }
        } else {
            super.update(dt);
        }
    }

    markForRespawn(): void {
        this.respawnDelay.setFrom(RESPAWN_DELAY);
        this.shouldRespawn = true;
    }

    override respawn(): boolean {
        assert(this.shouldRespawn);
        this.targetPath = [];
        this.respawnDelay.setMilliseconds(0);
        this.targetSearchTimer.setMilliseconds(0);
        return super.respawn();
    }

    private handleMaybeMissedTargetPoint(targetPoint: Vector2, dxPrev: number, dyPrev: number) {
        const dx = this.cx - targetPoint.x;
        const dy = this.cy - targetPoint.y;
        // NOTE: If entity overstepped the target point, stop it and move back to target.
        //       But only if case of a turn, because in a straight line tank starts bugging.
        if ((dxPrev === dx && !sameSign(dyPrev, dy)) || (dyPrev === dy && !sameSign(dxPrev, dx))) {
            this.targetPath.shift();
            if (this.isAtPoint(targetPoint)) {
            }
            const nextPoint = this.targetPath[0];
            if (nextPoint) {
                const nextDir = this.getDirectionToPoint(nextPoint);
                if (!nextDir) return;
                const targetDir = this.direction;
                if (targetDir === nextDir) {
                    return;
                }
                this.velocity = 0;
                const prevX = this.x;
                const prevY = this.y;
                if (dxPrev === dx) {
                    this.y = targetPoint.y - this.height / 2;
                } else if (dyPrev === dy) {
                    this.x = targetPoint.x - this.width / 2;
                }
                const c = this.manager.findCollided(this);
                if (c) {
                    this.x = prevX;
                    this.y = prevY;
                }
            }
        }
    }

    override handleCollision(target: Entity): void {
        super.handleCollision(target);
        if (target.id !== this.manager.player.id && !this.manager.player.dead) {
            this.direction = this.recalculateDirectionPath(this.manager.player) ?? this.direction;
        }
    }

    protected override onDied(): void {
        this.respawnDelay.setFrom(RESPAWN_DELAY);
    }

    private findTargetDirection(target: Entity, dt: Duration): Direction | null {
        this.targetSearchTimer.sub(dt).max(0);
        if (this.targetPath.length && this.targetSearchTimer.positive) {
            const targetPoint = this.targetPath[0];
            if (!targetPoint) return null;
            if (this.isAtPoint(targetPoint)) {
                this.targetPath.shift();
                const nextPoint = this.targetPath[0];
                return nextPoint ? this.getDirectionToPoint(nextPoint) : null;
            }
            return this.getDirectionToPoint(targetPoint);
        }

        return this.recalculateDirectionPath(target);
    }

    private recalculateDirectionPath(target: Entity): Direction | null {
        this.targetSearchTimer.setFrom(TARGET_SEARCH_DELAY);
        const path = findPath(this, target, this.manager, 1000, undefined, false);
        if (path) {
            this.targetPath = path;
            const nextPoint = this.targetPath[0];
            assert(nextPoint);
            return this.getDirectionToPoint(nextPoint);
        }
        return null;
    }

    private isAtPoint(next: Vector2): boolean {
        // NOTE: If entity is close enough to the target point, consider it reached
        const eps = 1;
        const diff = Math.max(Math.abs(this.cx - next.x), Math.abs(this.cy - next.y));
        return diff < eps;
    }

    private getDirectionToPoint(next: Vector2Like): Direction | null {
        const dx = next.x - Math.floor(this.cx);
        if (dx !== 0) {
            return dx > 0 ? Direction.EAST : Direction.WEST;
        }
        const dy = next.y - Math.floor(this.cy);
        if (dy !== 0) {
            return dy > 0 ? Direction.SOUTH : Direction.NORTH;
        }
        return null;
    }
}
